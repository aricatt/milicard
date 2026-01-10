import { PrismaClient } from '@prisma/client';
import {
  CreatePointVisitRequest,
  UpdatePointVisitRequest,
  PointVisitResponse,
  PointVisitListQuery,
} from '../types/pointVisit';
import ossService from './ossService';

const prisma = new PrismaClient();

class PointVisitService {
  /**
   * Create a new point visit record
   */
  async createVisit(
    data: CreatePointVisitRequest,
    imageUrls: string[],
    userId: string
  ): Promise<PointVisitResponse> {
    const visit = await prisma.pointVisit.create({
      data: {
        pointId: data.pointId,
        visitDate: new Date(),
        visitorName: data.visitorName,
        customerName: data.customerName,
        latitude: data.latitude,
        longitude: data.longitude,
        locationName: data.locationName,
        images: imageUrls,
        notes: data.notes,
        createdBy: userId,
      },
      include: {
        creator: {
          select: {
            id: true,
            name: true,
            username: true,
          },
        },
        point: {
          select: {
            id: true,
            code: true,
            name: true,
          },
        },
      },
    });

    return this.formatVisitResponse(visit);
  }

  /**
   * Get latest visit record for a point
   */
  async getLatestVisit(pointId: string): Promise<PointVisitResponse | null> {
    const visit = await prisma.pointVisit.findFirst({
      where: { pointId },
      orderBy: { visitDate: 'desc' },
      include: {
        creator: {
          select: {
            id: true,
            name: true,
            username: true,
          },
        },
        point: {
          select: {
            id: true,
            code: true,
            name: true,
          },
        },
      },
    });

    return visit ? this.formatVisitResponse(visit) : null;
  }

  /**
   * Get paginated visit records for a point
   */
  async getVisitList(query: PointVisitListQuery) {
    const { pointId, page = 1, limit = 10, startDate, endDate } = query;
    const skip = (page - 1) * limit;

    const where: any = { pointId };

    if (startDate || endDate) {
      where.visitDate = {};
      if (startDate) {
        where.visitDate.gte = new Date(startDate);
      }
      if (endDate) {
        where.visitDate.lte = new Date(endDate);
      }
    }

    const [visits, total] = await Promise.all([
      prisma.pointVisit.findMany({
        where,
        skip,
        take: limit,
        orderBy: { visitDate: 'desc' },
        include: {
          creator: {
            select: {
              id: true,
              name: true,
              username: true,
            },
          },
          point: {
            select: {
              id: true,
              code: true,
              name: true,
            },
          },
        },
      }),
      prisma.pointVisit.count({ where }),
    ]);

    return {
      data: visits.map((visit) => this.formatVisitResponse(visit)),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Update a visit record
   */
  async updateVisit(
    visitId: string,
    data: UpdatePointVisitRequest,
    newImageUrls?: string[]
  ): Promise<PointVisitResponse> {
    const updateData: any = {
      visitorName: data.visitorName,
      customerName: data.customerName,
      latitude: data.latitude,
      longitude: data.longitude,
      locationName: data.locationName,
      notes: data.notes,
    };

    if (newImageUrls) {
      updateData.images = newImageUrls;
    }

    const visit = await prisma.pointVisit.update({
      where: { id: visitId },
      data: updateData,
      include: {
        creator: {
          select: {
            id: true,
            name: true,
            username: true,
          },
        },
        point: {
          select: {
            id: true,
            code: true,
            name: true,
          },
        },
      },
    });

    return this.formatVisitResponse(visit);
  }

  /**
   * Delete a visit record and its images from OSS
   */
  async deleteVisit(visitId: string): Promise<void> {
    const visit = await prisma.pointVisit.findUnique({
      where: { id: visitId },
      select: { images: true },
    });

    if (!visit) {
      throw new Error('Visit record not found');
    }

    // Delete images from OSS if available
    if (visit.images.length > 0 && ossService.isAvailable()) {
      try {
        await ossService.deleteFiles(visit.images);
      } catch (error) {
        console.error('Failed to delete images from OSS:', error);
      }
    }

    await prisma.pointVisit.delete({
      where: { id: visitId },
    });
  }

  /**
   * Clean up old visit records (older than 7 days)
   * This should be called by a scheduled job
   */
  async cleanupOldVisits(): Promise<number> {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    // Find old visits with images
    const oldVisits = await prisma.pointVisit.findMany({
      where: {
        createdAt: {
          lt: sevenDaysAgo,
        },
      },
      select: {
        id: true,
        images: true,
      },
    });

    if (oldVisits.length === 0) {
      return 0;
    }

    // Collect all image URLs
    const allImageUrls = oldVisits.flatMap((visit) => visit.images);

    // Delete images from OSS
    if (allImageUrls.length > 0 && ossService.isAvailable()) {
      try {
        await ossService.deleteFiles(allImageUrls);
      } catch (error) {
        console.error('Failed to delete old images from OSS:', error);
      }
    }

    // Delete old visit records
    const result = await prisma.pointVisit.deleteMany({
      where: {
        id: {
          in: oldVisits.map((v) => v.id),
        },
      },
    });

    return result.count;
  }

  /**
   * Format visit response
   */
  private formatVisitResponse(visit: any): PointVisitResponse {
    return {
      id: visit.id,
      pointId: visit.pointId,
      visitDate: visit.visitDate,
      visitorName: visit.visitorName,
      customerName: visit.customerName,
      latitude: visit.latitude ? parseFloat(visit.latitude.toString()) : undefined,
      longitude: visit.longitude ? parseFloat(visit.longitude.toString()) : undefined,
      locationName: visit.locationName,
      images: visit.images,
      notes: visit.notes,
      createdBy: visit.createdBy,
      createdAt: visit.createdAt,
      updatedAt: visit.updatedAt,
      creator: visit.creator,
      point: visit.point,
    };
  }
}

export default new PointVisitService();
