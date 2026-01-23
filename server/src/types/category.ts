export interface CreateCategoryRequest {
  code: string
  name: string
  description?: string
  sortOrder?: number
}

export interface UpdateCategoryRequest {
  code?: string
  name?: string
  nameI18n?: Record<string, string> | null
  description?: string
  sortOrder?: number
  isActive?: boolean
}

export interface CategoryQueryParams {
  page?: number
  pageSize?: number
  search?: string
  isActive?: boolean
}

export interface CategoryResponse {
  id: number
  code: string
  name: string
  nameI18n?: Record<string, string> | null
  description: string | null
  sortOrder: number
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}

export interface CategoryListResponse {
  data: CategoryResponse[]
  pagination: {
    page: number
    pageSize: number
    total: number
    totalPages: number
  }
}
