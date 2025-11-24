import { PrismaClient } from '@prisma/client';
import { logger } from '../utils/logger';
import { CodeGenerator } from '../utils/codeGenerator';

const prisma = new PrismaClient();

export class LocationBaseService {
  /**
   * 获取基地的位置列表
   */
  static async getBaseLocationList(baseId: number, params: any = {}) {
    try {
      const { current = 1, pageSize = 10, name, type, isActive } = params;
      const skip = (current - 1) * pageSize;

      // 构建查询条件
      const where: any = { baseId };
      
      if (name) {
        where.name = {
          contains: name,
          mode: 'insensitive',
        };
      }
      
      if (type) {
        where.type = type;
      }
      
      if (isActive !== undefined) {
        where.isActive = isActive === 'true';
      }

      // 查询数据和总数
      const [locations, total] = await Promise.all([
        prisma.location.findMany({
          where,
          skip,
          take: pageSize,
          include: {
            base: { select: { id: true, name: true } },
          },
          orderBy: {
            createdAt: 'desc',
          },
        }),
        prisma.location.count({ where }),
      ]);

      // 格式化数据
      const formattedData = locations.map((item: any) => ({
        id: item.id,
        code: item.code,
        name: item.name,
        type: item.type,
        description: item.description,
        address: item.address,
        contactPerson: item.contactPerson,
        contactPhone: item.contactPhone,
        baseId: item.baseId,
        baseName: item.base.name,
        isActive: item.isActive,
        createdAt: item.createdAt,
        updatedAt: item.updatedAt,
      }));

      return {
        success: true,
        data: formattedData,
        total,
      };
    } catch (error) {
      logger.error('获取基地位置列表失败', { error, baseId, service: 'milicard-api' });
      throw error;
    }
  }

  /**
   * 创建位置
   */
  static async createLocation(baseId: number, locationData: any, createdBy: string = 'system') {
    try {
      // 生成业务编号
      const code = await CodeGenerator.generateLocationCode(locationData.type);

      const location = await prisma.location.create({
        data: {
          code,
          name: locationData.name,
          type: locationData.type,
          description: locationData.description,
          address: locationData.address,
          contactPerson: locationData.contactPerson,
          contactPhone: locationData.contactPhone,
          baseId: baseId,
          isActive: true,
        },
        include: {
          base: { select: { id: true, name: true } },
        },
      });

      // 格式化返回数据
      const formattedData = {
        id: location.id,
        code: location.code,
        name: location.name,
        type: location.type,
        description: location.description,
        address: location.address,
        contactPerson: location.contactPerson,
        contactPhone: location.contactPhone,
        baseId: location.baseId,
        baseName: location.base.name,
        isActive: location.isActive,
        createdAt: location.createdAt,
        updatedAt: location.updatedAt,
      };

      logger.info('位置创建成功', { 
        locationId: location.id, 
        code: location.code,
        baseId, 
        service: 'milicard-api' 
      });

      return {
        success: true,
        data: formattedData,
      };
    } catch (error) {
      logger.error('创建位置失败', { 
        error, 
        errorMessage: error instanceof Error ? error.message : String(error),
        errorStack: error instanceof Error ? error.stack : undefined,
        baseId, 
        locationData, 
        service: 'milicard-api' 
      });
      throw error;
    }
  }

  /**
   * 更新位置
   */
  static async updateLocation(baseId: number, locationId: number, locationData: any, updatedBy: string = 'system') {
    try {
      const location = await prisma.location.update({
        where: {
          id: locationId,
          baseId: baseId, // 确保只能更新本基地的位置
        },
        data: {
          name: locationData.name,
          type: locationData.type,
          description: locationData.description,
          address: locationData.address,
          contactPerson: locationData.contactPerson,
          contactPhone: locationData.contactPhone,
          isActive: locationData.isActive,
          updatedAt: new Date(),
        },
        include: {
          base: { select: { id: true, name: true } },
        },
      });

      // 格式化返回数据
      const formattedData = {
        id: location.id,
        code: location.code,
        name: location.name,
        type: location.type,
        description: location.description,
        address: location.address,
        contactPerson: location.contactPerson,
        contactPhone: location.contactPhone,
        baseId: location.baseId,
        baseName: location.base.name,
        isActive: location.isActive,
        createdAt: location.createdAt,
        updatedAt: location.updatedAt,
      };

      logger.info('位置更新成功', { 
        locationId, 
        baseId, 
        service: 'milicard-api' 
      });

      return {
        success: true,
        data: formattedData,
      };
    } catch (error) {
      logger.error('更新位置失败', { error, baseId, locationId, service: 'milicard-api' });
      throw error;
    }
  }

  /**
   * 删除位置
   */
  static async deleteLocation(baseId: number, locationId: number) {
    try {
      await prisma.location.delete({
        where: {
          id: locationId,
          baseId: baseId, // 确保只能删除本基地的位置
        },
      });

      logger.info('位置删除成功', { 
        locationId, 
        baseId, 
        service: 'milicard-api' 
      });

      return {
        success: true,
      };
    } catch (error) {
      logger.error('删除位置失败', { error, baseId, locationId, service: 'milicard-api' });
      throw error;
    }
  }

  /**
   * 获取基地位置统计
   */
  static async getBaseLocationStats(baseId: number) {
    try {
      const [
        totalLocations,
        liveRooms,
        warehouses,
        activeLocations,
      ] = await Promise.all([
        prisma.location.count({ where: { baseId } }),
        prisma.location.count({ where: { baseId, type: 'LIVE_ROOM' } }),
        prisma.location.count({ where: { baseId, type: 'WAREHOUSE' } }),
        prisma.location.count({ where: { baseId, isActive: true } }),
      ]);

      const result = {
        totalLocations,
        liveRooms,
        warehouses,
        activeLocations,
      };

      return {
        success: true,
        data: result
      };
    } catch (error) {
      logger.error('获取基地位置统计失败', { error, baseId, service: 'milicard-api' });
      throw error;
    }
  }

  /**
   * 获取位置详情
   */
  static async getLocationById(baseId: number, locationId: number) {
    try {
      const location = await prisma.location.findFirst({
        where: {
          id: locationId,
          baseId: baseId,
        },
        include: {
          base: { select: { id: true, name: true } },
        },
      });

      if (!location) {
        throw new Error('位置不存在');
      }

      // 格式化返回数据
      const formattedData = {
        id: location.id,
        code: location.code,
        name: location.name,
        type: location.type,
        description: location.description,
        address: location.address,
        contactPerson: location.contactPerson,
        contactPhone: location.contactPhone,
        baseId: location.baseId,
        baseName: location.base.name,
        isActive: location.isActive,
        createdAt: location.createdAt,
        updatedAt: location.updatedAt,
      };

      return {
        success: true,
        data: formattedData,
      };
    } catch (error) {
      logger.error('获取位置详情失败', { error, baseId, locationId, service: 'milicard-api' });
      throw error;
    }
  }
}
