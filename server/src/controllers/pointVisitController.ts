import { Request, Response } from 'express';
import pointVisitService from '../services/pointVisitService';
import ossService from '../services/ossService';
import { CreatePointVisitRequest, UpdatePointVisitRequest } from '../types/pointVisit';

class PointVisitController {
  /**
   * Create a new point visit record with image uploads
   */
  async createVisit(req: Request, res: Response) {
    try {
      const pointId = req.params.pointId;
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const data: CreatePointVisitRequest = {
        pointId,
        visitorName: req.body.visitorName,
        customerName: req.body.customerName,
        latitude: req.body.latitude ? parseFloat(req.body.latitude) : undefined,
        longitude: req.body.longitude ? parseFloat(req.body.longitude) : undefined,
        locationName: req.body.locationName,
        notes: req.body.notes,
      };

      // Validate required fields
      if (!data.visitorName) {
        return res.status(400).json({ error: 'Visitor name is required' });
      }

      // Handle image uploads
      let imageUrls: string[] = [];
      const files = req.files as Express.Multer.File[];

      if (files && files.length > 0) {
        if (files.length > 3) {
          return res.status(400).json({ error: 'Maximum 3 images allowed' });
        }

        try {
          const fileData = files.map((file) => ({
            buffer: file.buffer,
            originalName: file.originalname,
          }));
          imageUrls = await ossService.uploadFiles(fileData, 'point-visits');
        } catch (error) {
          console.error('Failed to upload images:', error);
          return res.status(500).json({ error: 'Failed to upload images' });
        }
      }

      const visit = await pointVisitService.createVisit(data, imageUrls, userId);

      res.status(201).json({
        success: true,
        data: visit,
      });
    } catch (error: any) {
      console.error('Error creating visit:', error);
      res.status(500).json({ error: error.message || 'Failed to create visit record' });
    }
  }

  /**
   * Get latest visit record for a point
   */
  async getLatestVisit(req: Request, res: Response) {
    try {
      const pointId = req.params.pointId;
      const visit = await pointVisitService.getLatestVisit(pointId);

      res.json({
        success: true,
        data: visit,
      });
    } catch (error: any) {
      console.error('Error getting latest visit:', error);
      res.status(500).json({ error: error.message || 'Failed to get latest visit' });
    }
  }

  /**
   * Get paginated visit list for a point
   */
  async getVisitList(req: Request, res: Response) {
    try {
      const pointId = req.params.pointId;
      const page = req.query.page ? parseInt(req.query.page as string) : 1;
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 10;
      const startDate = req.query.startDate as string;
      const endDate = req.query.endDate as string;

      const result = await pointVisitService.getVisitList({
        pointId,
        page,
        limit,
        startDate,
        endDate,
      });

      res.json({
        success: true,
        ...result,
      });
    } catch (error: any) {
      console.error('Error getting visit list:', error);
      res.status(500).json({ error: error.message || 'Failed to get visit list' });
    }
  }

  /**
   * Update a visit record
   */
  async updateVisit(req: Request, res: Response) {
    try {
      const visitId = req.params.visitId;
      const data: UpdatePointVisitRequest = req.body;

      // Handle new image uploads if provided
      let newImageUrls: string[] | undefined;
      const files = req.files as Express.Multer.File[];

      if (files && files.length > 0) {
        if (files.length > 3) {
          return res.status(400).json({ error: 'Maximum 3 images allowed' });
        }

        try {
          const fileData = files.map((file) => ({
            buffer: file.buffer,
            originalName: file.originalname,
          }));
          newImageUrls = await ossService.uploadFiles(fileData, 'point-visits');
        } catch (error) {
          console.error('Failed to upload images:', error);
          return res.status(500).json({ error: 'Failed to upload images' });
        }
      }

      const visit = await pointVisitService.updateVisit(visitId, data, newImageUrls);

      res.json({
        success: true,
        data: visit,
      });
    } catch (error: any) {
      console.error('Error updating visit:', error);
      res.status(500).json({ error: error.message || 'Failed to update visit' });
    }
  }

  /**
   * Delete a visit record
   */
  async deleteVisit(req: Request, res: Response) {
    try {
      const visitId = req.params.visitId;
      await pointVisitService.deleteVisit(visitId);

      res.json({
        success: true,
        message: 'Visit record deleted successfully',
      });
    } catch (error: any) {
      console.error('Error deleting visit:', error);
      res.status(500).json({ error: error.message || 'Failed to delete visit' });
    }
  }

  /**
   * Cleanup old visit records (admin endpoint)
   */
  async cleanupOldVisits(req: Request, res: Response) {
    try {
      const count = await pointVisitService.cleanupOldVisits();

      res.json({
        success: true,
        message: `Cleaned up ${count} old visit records`,
        count,
      });
    } catch (error: any) {
      console.error('Error cleaning up old visits:', error);
      res.status(500).json({ error: error.message || 'Failed to cleanup old visits' });
    }
  }
}

export default new PointVisitController();
