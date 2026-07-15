"use client";

import { useCallback, useMemo, useEffect, useRef, useState } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  type Node,
  type Edge,
  type NodeTypes,
  type NodeChange,
  MarkerType,
  useNodesState,
  useEdgesState,
  useReactFlow,
  ReactFlowProvider,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";

import CurriculumCourseNode, { type CourseNodeData } from "./CurriculumCourseNode";
import { useCurriculumStore } from "../hooks/curriculumStore";
import type { CurriculumTree, CurriculumCourse, CourseStatus } from "../types";

const nodeTypes: NodeTypes = {
  courseNode: CurriculumCourseNode,
};

const NODE_WIDTH = 155;
const MIN_GAP = 40;
const ROW_GAP_Y = 140;

// --- localStorage helpers for persisted positions ---
type SavedPositions = Record<string, { x: number; y: number }>;

function storageKey(curriculumId: number) {
  return `curriculum-positions-${curriculumId}`;
}

function loadPositions(curriculumId: number): SavedPositions {
  try {
    const raw = localStorage.getItem(storageKey(curriculumId));
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function savePositions(curriculumId: number, positions: SavedPositions) {
  try {
    localStorage.setItem(storageKey(curriculumId), JSON.stringify(positions));
  } catch {}
}

// --- Pre-compute maps ---

function buildPrereqNamesMap(courses: CurriculumCourse[]): Map<number, string[]> {
  const courseNameMap = new Map<number, string>();
  for (const c of courses) courseNameMap.set(c.id, c.course_name);

  const result = new Map<number, string[]>();
  for (const c of courses) {
    const names: string[] = [];
    for (const p of c.prerequisites) {
      if (p.prerequisite_type === "course" && p.prerequisite_course_name) {
        names.push(p.prerequisite_course_name);
      }
    }
    result.set(c.id, names);
  }
  return result;
}

function buildCreditPrereqsMap(courses: CurriculumCourse[]): Map<number, { required: number }[]> {
  const result = new Map<number, { required: number }[]>();
  for (const c of courses) {
    const creds: { required: number }[] = [];
    for (const p of c.prerequisites) {
      if (p.prerequisite_type === "credits" && p.required_credits) {
        creds.push({ required: p.required_credits });
      }
    }
    result.set(c.id, creds);
  }
  return result;
}

function buildUnlocksMap(courses: CurriculumCourse[]): Map<number, string[]> {
  // For each course, find which other courses list it as a prereq
  const result = new Map<number, string[]>();
  for (const c of courses) result.set(c.id, []);

  for (const c of courses) {
    for (const p of c.prerequisites) {
      if (p.prerequisite_type === "course" && p.prerequisite_course_id) {
        const list = result.get(p.prerequisite_course_id);
        if (list) list.push(c.course_name);
      }
    }
  }
  return result;
}

// Compute all ancestors and descendants of a node for highlighting
function computeHighlightSet(
  courseId: number,
  courses: CurriculumCourse[],
): Set<number> {
  const set = new Set<number>([courseId]);

  // Build adjacency maps
  const parentOf = new Map<number, number[]>(); // course → its prereq course ids
  const childOf = new Map<number, number[]>();  // course → courses that depend on it

  for (const c of courses) {
    const parents: number[] = [];
    for (const p of c.prerequisites) {
      if (p.prerequisite_type === "course" && p.prerequisite_course_id) {
        parents.push(p.prerequisite_course_id);
        const children = childOf.get(p.prerequisite_course_id) || [];
        children.push(c.id);
        childOf.set(p.prerequisite_course_id, children);
      }
    }
    parentOf.set(c.id, parents);
  }

  // Walk up (ancestors)
  const queue = [courseId];
  while (queue.length > 0) {
    const id = queue.pop()!;
    for (const pid of parentOf.get(id) || []) {
      if (!set.has(pid)) { set.add(pid); queue.push(pid); }
    }
  }

  // Walk down (descendants)
  const queue2 = [courseId];
  while (queue2.length > 0) {
    const id = queue2.pop()!;
    for (const cid of childOf.get(id) || []) {
      if (!set.has(cid)) { set.add(cid); queue2.push(cid); }
    }
  }

  return set;
}

// --- Layout algorithm ---

function resolveCollisions(items: { desiredX: number; id: number }[]): Map<number, number> {
  if (items.length === 0) return new Map();
  const sorted = [...items].sort((a, b) => a.desiredX - b.desiredX);
  const positions: number[] = new Array(sorted.length);
  positions[0] = sorted[0].desiredX;
  for (let i = 1; i < sorted.length; i++) {
    const minX = positions[i - 1] + NODE_WIDTH + MIN_GAP;
    positions[i] = Math.max(sorted[i].desiredX, minX);
  }
  const totalLeft = positions[0];
  const totalRight = positions[positions.length - 1] + NODE_WIDTH;
  const offset = -(totalLeft + totalRight) / 2;
  const result = new Map<number, number>();
  for (let i = 0; i < sorted.length; i++) {
    result.set(sorted[i].id, positions[i] + offset);
  }
  return result;
}

interface LayoutContext {
  getCourseStatus: (id: number) => CourseStatus;
  saved: SavedPositions;
  prereqNamesMap: Map<number, string[]>;
  creditPrereqsMap: Map<number, { required: number }[]>;
  unlocksMap: Map<number, string[]>;
  plannedPeriods: Map<number, string>;
  electiveLinks: Map<number, { courseId: number; courseName: string }>;
  highlightSet: Set<number> | null;
  onSetStatus: (courseId: number, status: string) => void;
  onSetPlan: (courseId: number, period: string | null) => void;
  onSelectNode: (courseId: number | null) => void;
  onSetElectiveLink: (courseId: number, linkedCourseId: number, linkedCourseName: string) => void;
}

function computeLayout(
  courses: CurriculumTree["courses"],
  ctx: LayoutContext,
) {
  const nodes: Node[] = [];
  const edges: Edge[] = [];

  const bySemester = new Map<number, typeof courses>();
  for (const c of courses) {
    const list = bySemester.get(c.semester) || [];
    list.push(c);
    bySemester.set(c.semester, list);
  }

  const centerMap = new Map<number, number>();
  const sortedSemesters = Array.from(bySemester.keys()).sort((a, b) => a - b);

  for (const sem of sortedSemesters) {
    const semCourses = bySemester.get(sem)!;

    const withPrereqs: { course: typeof semCourses[0]; desiredX: number }[] = [];
    const withoutPrereqs: typeof semCourses[0][] = [];

    for (const course of semCourses) {
      const savedPos = ctx.saved[`course-${course.id}`];
      if (savedPos) {
        centerMap.set(course.id, savedPos.x + NODE_WIDTH / 2);
        continue;
      }

      const prereqXs: number[] = [];
      for (const prereq of course.prerequisites) {
        if (prereq.prerequisite_type === "course" && prereq.prerequisite_course_id) {
          const cx = centerMap.get(prereq.prerequisite_course_id);
          if (cx !== undefined) prereqXs.push(cx);
        }
      }
      if (prereqXs.length > 0) {
        const avg = prereqXs.reduce((a, b) => a + b, 0) / prereqXs.length;
        withPrereqs.push({ course, desiredX: avg - NODE_WIDTH / 2 });
      } else {
        withoutPrereqs.push(course);
      }
    }

    const allItems: { desiredX: number; id: number; course: typeof semCourses[0] }[] = [];

    for (const { course, desiredX } of withPrereqs) {
      allItems.push({ desiredX, id: course.id, course });
    }

    if (withoutPrereqs.length > 0) {
      const preX = withPrereqs.map((p) => p.desiredX);
      const clusterCenter = preX.length > 0
        ? (Math.min(...preX) + Math.max(...preX) + NODE_WIDTH) / 2
        : 0;

      const gaps = [55, 35, 70, 28, 60, 42, 50, 38];
      let cursor = clusterCenter - ((withoutPrereqs.length - 1) * (NODE_WIDTH + 45)) / 2;

      withoutPrereqs.forEach((course, i) => {
        allItems.push({ desiredX: cursor, id: course.id, course });
        cursor += NODE_WIDTH + gaps[i % gaps.length];
      });
    }

    const finalPositions = resolveCollisions(
      allItems.map((it) => ({ desiredX: it.desiredX, id: it.id }))
    );

    const baseY = (sem - 1) * ROW_GAP_Y;

    const sortedByX = [...allItems].sort(
      (a, b) => (finalPositions.get(a.id) || 0) - (finalPositions.get(b.id) || 0)
    );

    // Place unsaved nodes
    sortedByX.forEach(({ course, id }, index) => {
      const x = finalPositions.get(id) || 0;
      centerMap.set(id, x + NODE_WIDTH / 2);

      const wave = [0, 22, 6, 28, 10, 26, 3, 18, 14, 30, 8, 20];
      const stagger = wave[(id * 7 + index) % wave.length];
      const y = baseY + stagger;

      nodes.push({
        id: `course-${id}`,
        type: "courseNode",
        position: { x, y },
        data: buildNodeData(course, ctx) as any,
      });
    });

    // Place saved-position nodes
    for (const course of semCourses) {
      const savedPos = ctx.saved[`course-${course.id}`];
      if (!savedPos) continue;

      nodes.push({
        id: `course-${course.id}`,
        type: "courseNode",
        position: { x: savedPos.x, y: savedPos.y },
        data: buildNodeData(course, ctx) as any,
      });
    }

    // Edges
    for (const course of semCourses) {
      const status = ctx.getCourseStatus(course.id);
      for (const prereq of course.prerequisites) {
        if (prereq.prerequisite_type === "course" && prereq.prerequisite_course_id) {
          const prereqStatus = ctx.getCourseStatus(prereq.prerequisite_course_id);
          const targetCompleted = status === "completed";
          const prereqCompleted = prereqStatus === "completed";

          // Highlight edges connected to selected node
          const isHighlighted = ctx.highlightSet &&
            ctx.highlightSet.has(course.id) &&
            ctx.highlightSet.has(prereq.prerequisite_course_id);

          const edgeColor = prereqCompleted && targetCompleted
            ? "#059669"
            : prereqCompleted
            ? "#6ee7b7"
            : isHighlighted
            ? "#52525b"
            : "#27272a";

          edges.push({
            id: `e-${prereq.prerequisite_course_id}-${course.id}`,
            source: `course-${prereq.prerequisite_course_id}`,
            target: `course-${course.id}`,
            type: "default",
            markerEnd: {
              type: MarkerType.ArrowClosed,
              width: 7,
              height: 7,
              color: edgeColor,
            },
            style: {
              stroke: edgeColor,
              strokeWidth: isHighlighted ? 2 : prereqCompleted ? 1.5 : 1,
              opacity: isHighlighted ? 0.8 : prereqCompleted ? 0.7 : 0.2,
            },
          });
        }
      }
    }
  }

  return { nodes, edges };
}

function buildNodeData(
  course: CurriculumCourse,
  ctx: LayoutContext,
): CourseNodeData {
  const status = ctx.getCourseStatus(course.id);
  const dimmed = ctx.highlightSet !== null && !ctx.highlightSet.has(course.id);
  const explicitLink = ctx.electiveLinks.get(course.id);

  return {
    label: course.course_name,
    credits: course.credits,
    semester: course.semester,
    courseId: course.id,
    status,
    isElective: course.is_elective,
    linkedCourseId: explicitLink ? explicitLink.courseId : course.linked_course_id,
    linkedCourseName: explicitLink ? explicitLink.courseName : undefined,
    plannedPeriod: ctx.plannedPeriods.get(course.id) || null,
    prerequisiteNames: ctx.prereqNamesMap.get(course.id) || [],
    creditPrerequisites: ctx.creditPrereqsMap.get(course.id) || [],
    unlocksNames: ctx.unlocksMap.get(course.id) || [],
    dimmed,
    onSetStatus: ctx.onSetStatus,
    onSetPlan: ctx.onSetPlan,
    onSelectNode: ctx.onSelectNode,
    onSetElectiveLink: ctx.onSetElectiveLink,
  };
}

// --- Component ---

interface CurriculumGraphProps {
  curriculum: CurriculumTree;
}

function CurriculumGraphInner({ curriculum }: CurriculumGraphProps) {
  const { getCourseStatus, setStatusFromPopover, setPlan, setElectiveLink } = useCurriculumStore();
  const { fitView } = useReactFlow();

  const localOverrides = useCurriculumStore((s) => s.localOverrides);
  const unlockedIds = useCurriculumStore((s) => s.unlockedIds);
  const progressMap = useCurriculumStore((s) => s.progressMap);
  const plannedPeriods = useCurriculumStore((s) => s.plannedPeriods);
  const electiveLinks = useCurriculumStore((s) => s.electiveLinks);

  const positionsRef = useRef<SavedPositions>(loadPositions(curriculum.id));
  const initialFitDone = useRef(false);
  const [selectedNodeId, setSelectedNodeId] = useState<number | null>(null);

  // Pre-compute relationship maps (stable unless curriculum changes)
  const prereqNamesMap = useMemo(() => buildPrereqNamesMap(curriculum.courses), [curriculum]);
  const creditPrereqsMap = useMemo(() => buildCreditPrereqsMap(curriculum.courses), [curriculum]);
  const unlocksMap = useMemo(() => buildUnlocksMap(curriculum.courses), [curriculum]);

  const highlightSet = useMemo(() => {
    if (selectedNodeId === null) return null;
    return computeHighlightSet(selectedNodeId, curriculum.courses);
  }, [selectedNodeId, curriculum.courses]);

  const handleSetStatus = useCallback(
    (courseId: number, status: string) => {
      setStatusFromPopover(curriculum.id, courseId, status);
    },
    [curriculum.id, setStatusFromPopover]
  );

  const handleSetPlan = useCallback(
    (courseId: number, period: string | null) => {
      setPlan(curriculum.id, courseId, period);
    },
    [curriculum.id, setPlan]
  );

  const handleSelectNode = useCallback(
    (courseId: number | null) => {
      setSelectedNodeId(courseId);
    },
    []
  );

  const handleSetElectiveLink = useCallback(
    (courseId: number, linkedCourseId: number, linkedCourseName: string) => {
      setElectiveLink(curriculum.id, courseId, linkedCourseId, linkedCourseName);
    },
    [curriculum.id, setElectiveLink]
  );

  const { layoutedNodes, layoutedEdges } = useMemo(() => {
    const ctx: LayoutContext = {
      getCourseStatus,
      saved: positionsRef.current,
      prereqNamesMap,
      creditPrereqsMap,
      unlocksMap,
      plannedPeriods,
      electiveLinks,
      highlightSet,
      onSetStatus: handleSetStatus,
      onSetPlan: handleSetPlan,
      onSelectNode: handleSelectNode,
      onSetElectiveLink: handleSetElectiveLink,
    };
    const { nodes, edges } = computeLayout(curriculum.courses, ctx);
    return { layoutedNodes: nodes, layoutedEdges: edges };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [curriculum, localOverrides, unlockedIds, progressMap, plannedPeriods, electiveLinks, highlightSet, handleSetStatus, handleSetPlan, handleSelectNode, handleSetElectiveLink, getCourseStatus, prereqNamesMap, creditPrereqsMap, unlocksMap]);

  const [nodes, setNodes, onNodesChange] = useNodesState(layoutedNodes);
  const [edgesState, setEdges, onEdgesChange] = useEdgesState(layoutedEdges);

  useEffect(() => {
    setNodes((currentNodes: Node[]) => {
      const currentPosMap = new Map<string, { x: number; y: number }>();
      for (const n of currentNodes) {
        currentPosMap.set(n.id, n.position);
      }
      return layoutedNodes.map((newNode) => {
        const currentPos = currentPosMap.get(newNode.id);
        if (currentPos) {
          return { ...newNode, position: currentPos };
        }
        return newNode;
      });
    });
    setEdges(layoutedEdges);

    if (!initialFitDone.current) {
      initialFitDone.current = true;
      setTimeout(() => fitView({ padding: 0.15, duration: 300 }), 50);
    }
  }, [layoutedNodes, layoutedEdges, setNodes, setEdges, fitView]);

  const handleNodesChange = useCallback(
    (changes: NodeChange[]) => {
      onNodesChange(changes);
      for (const change of changes) {
        if (change.type === "position" && change.dragging === false && change.position) {
          const saved = positionsRef.current;
          saved[change.id] = { x: change.position.x, y: change.position.y };
          positionsRef.current = saved;
          savePositions(curriculum.id, saved);
        }
      }
    },
    [onNodesChange, curriculum.id]
  );

  // Close popovers on canvas pan
  const handleMove = useCallback(() => {
    if (selectedNodeId !== null) {
      setSelectedNodeId(null);
    }
  }, [selectedNodeId]);

  return (
    <ReactFlow
      nodes={nodes}
      edges={edgesState}
      onNodesChange={handleNodesChange}
      onEdgesChange={onEdgesChange}
      onMoveStart={handleMove}
      nodeTypes={nodeTypes}
      fitView
      fitViewOptions={{ padding: 0.15 }}
      minZoom={0.15}
      maxZoom={2.5}
      proOptions={{ hideAttribution: true }}
      nodesDraggable={true}
    >
      <Background gap={40} size={1} color="#18181b" />
      <Controls
        showInteractive={false}
        className="!bg-zinc-900/90 !border-zinc-800 !rounded-lg !shadow-lg [&>button]:!bg-zinc-900 [&>button]:!border-zinc-800 [&>button]:!text-zinc-500 [&>button:hover]:!bg-zinc-800"
      />
    </ReactFlow>
  );
}

export default function CurriculumGraph({ curriculum }: CurriculumGraphProps) {
  return (
    <div className="w-full h-full bg-zinc-950">
      <ReactFlowProvider>
        <CurriculumGraphInner curriculum={curriculum} />
      </ReactFlowProvider>
    </div>
  );
}
