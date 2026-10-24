import os
import hashlib
import re
from pathlib import Path
from typing import Tuple, Dict, Any, BinaryIO
from fastapi import UploadFile, HTTPException
from app.config import settings

def sanitize_filename(filename: str) -> str:
    """Strip dangerous characters and path traversal attempts."""
    base = os.path.basename(filename)
    # Remove any characters other than alphanumeric, dots, dashes, underscores
    sanitized = re.sub(r'[^a-zA-Z0-9_.-]', '_', base)
    return sanitized or "unnamed_evidence"

class StorageService:
    def __init__(self, base_dir: str = None):
        self.base_dir = Path(base_dir or settings.UPLOADS_DIR)
        self.reports_dir = Path(settings.REPORTS_DIR)
        self.base_dir.mkdir(parents=True, exist_ok=True)
        self.reports_dir.mkdir(parents=True, exist_ok=True)

    def calculate_sha256(self, file_path: Path) -> str:
        """Compute forensic SHA-256 integrity hash of a file on disk."""
        sha256 = hashlib.sha256()
        with open(file_path, "rb") as f:
            for chunk in iter(lambda: f.read(65536), b""):
                sha256.update(chunk)
        return sha256.hexdigest()

    def calculate_bytes_sha256(self, data: bytes) -> str:
        """Compute forensic SHA-256 hash from in-memory byte buffer."""
        return hashlib.sha256(data).hexdigest()

    async def save_evidence_file(
        self, case_id: str, evidence_id: str, upload_file: UploadFile
    ) -> Tuple[str, str, int, str]:
        """
        Saves incoming upload securely, enforces max size, and computes SHA-256 hash.
        Returns: (saved_path, sanitized_original_name, file_size_bytes, sha256_hash)
        """
        safe_name = sanitize_filename(upload_file.filename or "evidence.bin")
        case_folder = self.base_dir / case_id
        case_folder.mkdir(parents=True, exist_ok=True)

        target_path = case_folder / f"{evidence_id}_{safe_name}"

        sha256 = hashlib.sha256()
        total_size = 0
        max_bytes = settings.MAX_UPLOAD_SIZE_MB * 1024 * 1024

        with open(target_path, "wb") as destination:
            while True:
                chunk = await upload_file.read(65536)
                if not chunk:
                    break
                total_size += len(chunk)
                if total_size > max_bytes:
                    # Clean up partial write
                    destination.close()
                    if target_path.exists():
                        target_path.unlink()
                    raise HTTPException(
                        status_code=413,
                        detail=f"Uploaded file exceeds maximum limit of {settings.MAX_UPLOAD_SIZE_MB}MB"
                    )
                sha256.update(chunk)
                destination.write(chunk)

        computed_hash = sha256.hexdigest()
        return str(target_path), safe_name, total_size, computed_hash

    def detect_media_type(self, filename: str, mime_type: str = "") -> str:
        ext = os.path.splitext(filename)[1].lower()
        if ext in [".jpg", ".jpeg", ".png", ".webp", ".bmp", ".tiff", ".gif"] or "image" in mime_type:
            return "image"
        elif ext in [".mp4", ".avi", ".mov", ".mkv", ".webm", ".m4v"] or "video" in mime_type:
            return "video"
        elif ext in [".mp3", ".wav", ".m4a", ".aac", ".ogg", ".flac", ".wma"] or "audio" in mime_type:
            return "audio"
        elif ext in [".txt", ".pdf", ".docx", ".doc", ".json"]:
            return "document"
        return "binary"

    def get_evidence_path(self, file_path_str: str) -> Path:
        """Safely verifies file exists within allowed storage directory."""
        path = Path(file_path_str).resolve()
        # Ensure path is within storage directory
        try:
            path.relative_to(Path(settings.STORAGE_DIR).resolve())
        except ValueError:
            raise HTTPException(status_code=403, detail="Access denied: invalid evidence path")
        if not path.exists():
            raise HTTPException(status_code=404, detail="Evidence file not found on disk")
        return path

storage_service = StorageService()
