import os
import cloudinary
import cloudinary.uploader
from cloudinary.utils import cloudinary_url
from fastapi import UploadFile
from typing import Optional

class CloudinaryService:
    def __init__(self):
        cloudinary.config(
            cloud_name=os.getenv("CLOUDINARY_CLOUD_NAME"),
            api_key=os.getenv("CLOUDINARY_API_KEY"),
            api_secret=os.getenv("CLOUDINARY_API_SECRET")
        )

    async def upload_profile_photo(self, file: UploadFile, user_id: int) -> str:
        """Upload profile photo to Cloudinary with optimization"""
        try:
            # Read file content
            file_content = await file.read()
            
            # Upload to Cloudinary with transformations
            result = cloudinary.uploader.upload(
                file_content,
                folder="schedule_maker/profile_photos",
                public_id=f"user_{user_id}",  # Overwrites previous photo
                transformation=[
                    {"width": 400, "height": 400, "crop": "fill", "gravity": "face"},
                    {"quality": "auto:good"},
                    {"format": "auto"}  # Auto WebP/AVIF
                ],
                invalidate=True  # Clear CDN cache
            )
            
            return result['secure_url']
        
        except Exception as e:
            raise Exception(f"Failed to upload image: {str(e)}")

    async def delete_profile_photo(self, user_id: int) -> bool:
        """Delete profile photo from Cloudinary"""
        try:
            public_id = f"schedule_maker/profile_photos/user_{user_id}"
            result = cloudinary.uploader.destroy(public_id)
            return result.get('result') == 'ok'
        except Exception as e:
            print(f"Error deleting image: {str(e)}")
            return False

# Create service instance
cloudinary_service = CloudinaryService()