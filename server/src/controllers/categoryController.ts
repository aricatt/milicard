import { Request, Response } from 'express'
import { categoryService } from '../services/categoryService'
import { CreateCategoryRequest, UpdateCategoryRequest, CategoryQueryParams } from '../types/category'

export class CategoryController {
  async create(req: Request, res: Response): Promise<void> {
    try {
      const data: CreateCategoryRequest = req.body
      
      if (!data.code || !data.name) {
        res.status(400).json({ error: '品类编码和名称不能为空' })
        return
      }

      const category = await categoryService.create(data)
      res.status(201).json(category)
    } catch (error: any) {
      if (error.code === 'P2002') {
        res.status(400).json({ error: '品类编码已存在' })
        return
      }
      console.error('Create category error:', error)
      res.status(500).json({ error: '创建品类失败' })
    }
  }

  async update(req: Request, res: Response): Promise<void> {
    try {
      const id = parseInt(req.params.id)
      if (isNaN(id)) {
        res.status(400).json({ error: '无效的品类ID' })
        return
      }

      const data: UpdateCategoryRequest = req.body
      const category = await categoryService.update(id, data)
      res.json(category)
    } catch (error: any) {
      if (error.code === 'P2025') {
        res.status(404).json({ error: '品类不存在' })
        return
      }
      if (error.code === 'P2002') {
        res.status(400).json({ error: '品类编码已存在' })
        return
      }
      console.error('Update category error:', error)
      res.status(500).json({ error: '更新品类失败' })
    }
  }

  async delete(req: Request, res: Response): Promise<void> {
    try {
      const id = parseInt(req.params.id)
      if (isNaN(id)) {
        res.status(400).json({ error: '无效的品类ID' })
        return
      }

      await categoryService.delete(id)
      res.status(204).send()
    } catch (error: any) {
      if (error.code === 'P2025') {
        res.status(404).json({ error: '品类不存在' })
        return
      }
      if (error.message?.includes('无法删除')) {
        res.status(400).json({ error: error.message })
        return
      }
      console.error('Delete category error:', error)
      res.status(500).json({ error: '删除品类失败' })
    }
  }

  async getById(req: Request, res: Response): Promise<void> {
    try {
      const id = parseInt(req.params.id)
      if (isNaN(id)) {
        res.status(400).json({ error: '无效的品类ID' })
        return
      }

      const category = await categoryService.getById(id)
      if (!category) {
        res.status(404).json({ error: '品类不存在' })
        return
      }
      res.json(category)
    } catch (error) {
      console.error('Get category error:', error)
      res.status(500).json({ error: '获取品类失败' })
    }
  }

  async list(req: Request, res: Response): Promise<void> {
    try {
      const params: CategoryQueryParams = {
        page: req.query.page ? parseInt(req.query.page as string) : 1,
        pageSize: req.query.pageSize ? parseInt(req.query.pageSize as string) : 10,
        search: req.query.search as string,
        isActive: req.query.isActive === 'true' ? true : req.query.isActive === 'false' ? false : undefined
      }

      const result = await categoryService.list(params)
      res.json(result)
    } catch (error) {
      console.error('List categories error:', error)
      res.status(500).json({ error: '获取品类列表失败' })
    }
  }

  async getAll(req: Request, res: Response): Promise<void> {
    try {
      const activeOnly = req.query.activeOnly !== 'false'
      const categories = await categoryService.getAll(activeOnly)
      res.json(categories)
    } catch (error) {
      console.error('Get all categories error:', error)
      res.status(500).json({ error: '获取品类列表失败' })
    }
  }
}

export const categoryController = new CategoryController()
