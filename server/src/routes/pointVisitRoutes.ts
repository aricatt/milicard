import express from 'express';
import multer from 'multer';
import pointVisitController from '../controllers/pointVisitController';
import { authenticateToken } from '../middleware/authMiddleware';

const router = express.Router();

// Configure multer for memory storage (files will be uploaded to OSS)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB per file
    files: 3, // Maximum 3 files
  },
  fileFilter: (req, file, cb) => {
    // Accept only image files
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  },
});

// All routes require authentication
router.use(authenticateToken);

// Get latest visit for a point
router.get('/points/:pointId/visits/latest', pointVisitController.getLatestVisit);

// Get paginated visit list for a point
router.get('/points/:pointId/visits', pointVisitController.getVisitList);

// Create a new visit record with image uploads
router.post('/points/:pointId/visits', upload.array('images', 3), pointVisitController.createVisit);

// Update a visit record
router.put('/visits/:visitId', upload.array('images', 3), pointVisitController.updateVisit);

// Delete a visit record
router.delete('/visits/:visitId', pointVisitController.deleteVisit);

// Admin endpoint: cleanup old visits (older than 7 days)
router.post('/admin/visits/cleanup', pointVisitController.cleanupOldVisits);

export default router;
