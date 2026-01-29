import { PrismaClient, Prisma } from '@prisma/client'
import {
  CreateCategoryRequest,
  UpdateCategoryRequest,
  CategoryQueryParams,
  CategoryResponse,
  CategoryListResponse
} from '../types/category'

const prisma = new PrismaClient()

export class CategoryService {
  async create(data: CreateCategoryRequest): Promise<CategoryResponse> {
    const category = await prisma.category.create({
      data: {
        code: data.code.toUpperCase(),
        name: data.name,
        description: data.description,
        sortOrder: data.sortOrder ?? 0
      }
    })
    return this.toResponse(category)
  }

  async update(id: number, data: UpdateCategoryRequest): Promise<CategoryResponse> {
    const category = await prisma.category.update({
      where: { id },
      data: {
        ...(data.code && { code: data.code.toUpperCase() }),
        ...(data.name && { name: data.name }),
        ...(data.nameI18n !== undefined && { nameI18n: data.nameI18n }),
        ...(data.description !== undefined && { description: data.description }),
        ...(data.sortOrder !== undefined && { sortOrder: data.sortOrder }),
        ...(data.isActive !== undefined && { isActive: data.isActive })
      }
    })
    return this.toResponse(category)
  }

  async delete(id: number): Promise<void> {
    // Check if category is in use
    const goodsCount = await prisma.goods.count({
      where: { categoryId: id }
    })
    if (goodsCount > 0) {
      throw new Error(`无法删除：该品类下有 ${goodsCount} 个商品`)
    }
    await prisma.category.delete({ where: { id } })
  }

  async getById(id: number): Promise<CategoryResponse | null> {
    const category = await prisma.category.findUnique({ where: { id } })
    return category ? this.toResponse(category) : null
  }

  async getByCode(code: string): Promise<CategoryResponse | null> {
    const category = await prisma.category.findUnique({ where: { code: code.toUpperCase() } })
    return category ? this.toResponse(category) : null
  }

  async list(params: CategoryQueryParams): Promise<CategoryListResponse> {
    const { page = 1, pageSize = 10, search, isActive } = params

    const where: Prisma.CategoryWhereInput = {}

    if (search) {
      where.OR = [
        { code: { contains: search, mode: 'insensitive' } },
        { name: { contains: search, mode: 'insensitive' } }
      ]
    }

    if (isActive !== undefined) {
      where.isActive = isActive
    }

    const [categories, total] = await Promise.all([
      prisma.category.findMany({
        where,
        orderBy: [{ sortOrder: 'asc' }, { code: 'asc' }],
        skip: (page - 1) * pageSize,
        take: pageSize
      }),
      prisma.category.count({ where })
    ])

    return {
      data: categories.map(c => this.toResponse(c)),
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize)
      }
    }
  }

  async getAll(activeOnly: boolean = true): Promise<CategoryResponse[]> {
    const categories = await prisma.category.findMany({
      where: activeOnly ? { isActive: true } : {},
      orderBy: [{ sortOrder: 'asc' }, { code: 'asc' }],
      select: {
        id: true,
        code: true,
        name: true,
        nameI18n: true,
        description: true,
        sortOrder: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      }
    })
    return categories.map(c => this.toResponse(c))
  }

  private toResponse(category: {
    id: number
    code: string
    name: string
    nameI18n?: any
    description: string | null
    sortOrder: number
    isActive: boolean
    createdAt: Date
    updatedAt: Date
  }): CategoryResponse {
    return {
      id: category.id,
      code: category.code,
      name: category.name,
      nameI18n: category.nameI18n as Record<string, string> | null | undefined,
      description: category.description,
      sortOrder: category.sortOrder,
      isActive: category.isActive,
      createdAt: category.createdAt,
      updatedAt: category.updatedAt
    }
  }
}

export const categoryService = new CategoryService()
