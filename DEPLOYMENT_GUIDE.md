# Schedule Maker 2.0 - Deployment Guide

## Overview
This guide covers deploying your Schedule Maker application using a split deployment approach:
- **Frontend**: Next.js app deployed to Vercel
- **Backend**: FastAPI deployed to Railway/Render
- **Database**: PostgreSQL on cloud provider

## Prerequisites
- GitHub account
- Vercel account
- Railway/Render account
- Domain (optional)

---

## 1. Database Setup

### Option A: Supabase (Recommended)
1. Go to [supabase.com](https://supabase.com)
2. Create new project
3. Wait for database provisioning
4. Go to Settings → Database
5. Copy connection string (starts with `postgresql://`)

### Option B: Railway PostgreSQL
1. Go to [railway.app](https://railway.app)
2. Create new project
3. Add PostgreSQL service
4. Copy connection string from Variables tab

### Option C: Render PostgreSQL
1. Go to [render.com](https://render.com)
2. Create new PostgreSQL database
3. Copy connection details

---

## 2. Backend Deployment

### Option A: Railway (Recommended)
1. Push your code to GitHub (including the `nixpacks.toml` file in the root)
2. Go to [railway.app](https://railway.app)
3. Create new project → Deploy from GitHub
4. Select your repository (deploy the entire repo, not just backend folder)
5. Railway will automatically use the `nixpacks.toml` configuration
6. Add environment variables:
   ```
   DATABASE_URL=your_postgresql_connection_string
   SECRET_KEY=your-super-secret-key-here-min-32-chars
   ALGORITHM=HS256
   ACCESS_TOKEN_EXPIRE_MINUTES=30
   CORS_ORIGINS=https://your-frontend-domain.vercel.app
   DEBUG=False
   WS_HOST=0.0.0.0
   WS_PORT=8000
   ```
7. Deploy and copy the generated URL

### Option B: Render
1. Push your code to GitHub
2. Go to [render.com](https://render.com)
3. Create new Web Service
4. Connect your GitHub repo
5. Set:
   - **Root Directory**: `backend`
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
6. Add environment variables (same as Railway)
7. Deploy and copy the service URL

---

## 3. Frontend Deployment

### Vercel Deployment
1. Push your code to GitHub
2. Go to [vercel.com](https://vercel.com)
3. Import your GitHub repository
4. Set:
   - **Root Directory**: `frontend`
   - **Framework**: Next.js
5. Add environment variables:
   ```
   NEXT_PUBLIC_API_URL=https://your-backend-url.railway.app
   NEXT_PUBLIC_WS_URL=wss://your-backend-url.railway.app
   ```
6. Deploy

---

## 4. Database Migration

### Initial Setup
1. Install dependencies locally in backend folder:
   ```bash
   cd backend
   pip install -r requirements.txt
   ```

2. Set local environment variable:
   ```bash
   export DATABASE_URL="your_production_database_url"
   ```

3. Run database setup script:
   ```bash
   python scripts/setup_database.py
   ```

4. (Optional) Import sample data:
   ```bash
   python scripts/generate_fake_courses.py
   ```

---

## 5. Environment Variables Reference

### Backend Environment Variables
```env
DATABASE_URL=postgresql://user:pass@host:port/dbname
SECRET_KEY=your-super-secret-key-here-minimum-32-characters
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30
CORS_ORIGINS=https://your-frontend-domain.vercel.app,https://another-domain.com
DEBUG=False
WS_HOST=0.0.0.0
WS_PORT=8000
```

### Frontend Environment Variables
```env
NEXT_PUBLIC_API_URL=https://your-backend-url.railway.app
NEXT_PUBLIC_WS_URL=wss://your-backend-url.railway.app
```

---

## 6. Post-Deployment Checklist

### Test Core Functionality
- [ ] Frontend loads correctly
- [ ] API endpoints respond (test with `/docs`)
- [ ] Database connection works
- [ ] User registration/login works
- [ ] WebSocket connections work
- [ ] CORS is properly configured

### Security Checklist
- [ ] Change default SECRET_KEY
- [ ] Set DEBUG=False in production
- [ ] Configure CORS_ORIGINS properly
- [ ] Use HTTPS URLs only
- [ ] Database has proper access controls

### Performance Optimization
- [ ] Enable gzip compression
- [ ] Set up CDN for static assets
- [ ] Configure database connection pooling
- [ ] Monitor application performance

---

## 7. Troubleshooting

### Common Issues

**CORS Errors**
- Ensure CORS_ORIGINS includes your frontend URL
- Check protocol (http vs https)
- Verify no trailing slashes

**Database Connection Issues**
- Verify connection string format
- Check network access rules
- Ensure database is running

**WebSocket Connection Fails**
- Use `wss://` for HTTPS sites
- Check firewall/proxy settings
- Verify WebSocket endpoint is accessible

**Build Failures**
- Check Node.js version compatibility
- Verify all dependencies are listed
- Review build logs for specific errors

---

## 8. Monitoring and Maintenance

### Recommended Tools
- **Uptime Monitoring**: UptimeRobot, Pingdom
- **Error Tracking**: Sentry
- **Performance**: Vercel Analytics, Railway Metrics
- **Database**: Built-in provider monitoring

### Regular Maintenance
- Monitor application logs
- Update dependencies regularly
- Backup database periodically
- Review security settings

---

## 9. Cost Estimation

### Free Tier Limits
- **Vercel**: 100GB bandwidth, unlimited requests
- **Railway**: $5/month credit, then pay-as-you-go
- **Supabase**: 2 projects, 500MB database
- **Render**: 750 hours/month free

### Expected Monthly Costs
- **Small app**: $0-15/month
- **Medium traffic**: $15-50/month
- **High traffic**: $50+/month

---

## Support

If you encounter issues:
1. Check the troubleshooting section
2. Review deployment platform documentation
3. Check application logs
4. Test locally first to isolate issues

Good luck with your deployment! 🚀