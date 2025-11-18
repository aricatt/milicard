import { JwtService } from '../jwtService'
import { AuthError, AuthErrorType } from '../../types/auth'

// 模拟环境变量
const originalEnv = process.env
beforeAll(() => {
  process.env.JWT_SECRET = 'test-jwt-secret-key-for-testing-purposes-only'
  process.env.JWT_REFRESH_SECRET = 'test-refresh-secret-key-for-testing-purposes-only'
})

afterAll(() => {
  process.env = originalEnv
})

describe('JwtService', () => {
  const mockPayload = {
    userId: 'user-123',
    username: 'testuser',
    roles: ['USER']
  }

  describe('generateAccessToken', () => {
    it('should generate valid access token', () => {
      const token = JwtService.generateAccessToken(mockPayload)
      
      expect(token).toBeDefined()
      expect(typeof token).toBe('string')
      expect(token.split('.')).toHaveLength(3) // JWT格式：header.payload.signature
    })

    it('should generate different tokens for same payload', () => {
      const token1 = JwtService.generateAccessToken(mockPayload)
      const token2 = JwtService.generateAccessToken(mockPayload)
      
      expect(token1).not.toBe(token2) // 因为时间戳不同
    })
  })

  describe('generateRefreshToken', () => {
    it('should generate valid refresh token', () => {
      const token = JwtService.generateRefreshToken(mockPayload.userId)
      
      expect(token).toBeDefined()
      expect(typeof token).toBe('string')
      expect(token.split('.')).toHaveLength(3)
    })

    it('should generate different refresh tokens', () => {
      const token1 = JwtService.generateRefreshToken(mockPayload.userId)
      const token2 = JwtService.generateRefreshToken(mockPayload.userId)
      
      expect(token1).not.toBe(token2)
    })
  })

  describe('verifyAccessToken', () => {
    it('should verify valid access token', () => {
      const token = JwtService.generateAccessToken(mockPayload)
      const decoded = JwtService.verifyAccessToken(token)
      
      expect(decoded.userId).toBe(mockPayload.userId)
      expect(decoded.username).toBe(mockPayload.username)
      expect(decoded.roles).toEqual(mockPayload.roles)
      expect(decoded.iat).toBeDefined()
      expect(decoded.exp).toBeDefined()
    })

    it('should reject invalid token', () => {
      const invalidToken = 'invalid.token.here'
      
      expect(() => {
        JwtService.verifyAccessToken(invalidToken)
      }).toThrow(AuthError)
    })

    it('should reject malformed token', () => {
      const malformedToken = 'not-a-jwt-token'
      
      expect(() => {
        JwtService.verifyAccessToken(malformedToken)
      }).toThrow(AuthError)
    })

    it('should handle expired token', () => {
      // 创建一个已过期的token（通过修改系统时间模拟）
      const token = JwtService.generateAccessToken(mockPayload)
      
      // 模拟时间前进，使token过期
      const originalDate = Date.now
      Date.now = jest.fn(() => originalDate() + 20 * 60 * 1000) // 20分钟后
      
      try {
        expect(() => {
          JwtService.verifyAccessToken(token)
        }).toThrow(AuthError)
      } finally {
        Date.now = originalDate
      }
    })
  })

  describe('verifyRefreshToken', () => {
    it('should verify valid refresh token', () => {
      const token = JwtService.generateRefreshToken(mockPayload.userId)
      const decoded = JwtService.verifyRefreshToken(token)
      
      expect(decoded.userId).toBe(mockPayload.userId)
    })

    it('should reject invalid refresh token', () => {
      const invalidToken = 'invalid.refresh.token'
      
      expect(() => {
        JwtService.verifyRefreshToken(invalidToken)
      }).toThrow(AuthError)
    })

    it('should reject access token as refresh token', () => {
      const accessToken = JwtService.generateAccessToken(mockPayload)
      
      expect(() => {
        JwtService.verifyRefreshToken(accessToken)
      }).toThrow(AuthError)
    })
  })

  describe('extractTokenFromHeader', () => {
    it('should extract token from valid Bearer header', () => {
      const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9'
      const authHeader = `Bearer ${token}`
      
      const extracted = JwtService.extractTokenFromHeader(authHeader)
      expect(extracted).toBe(token)
    })

    it('should return null for missing header', () => {
      const extracted = JwtService.extractTokenFromHeader(undefined)
      expect(extracted).toBeNull()
    })

    it('should return null for invalid header format', () => {
      const extracted1 = JwtService.extractTokenFromHeader('InvalidHeader')
      const extracted2 = JwtService.extractTokenFromHeader('Basic token123')
      const extracted3 = JwtService.extractTokenFromHeader('Bearer')
      
      expect(extracted1).toBeNull()
      expect(extracted2).toBeNull()
      expect(extracted3).toBeNull()
    })
  })

  describe('getTokenRemainingTime', () => {
    it('should return remaining time for valid token', () => {
      const token = JwtService.generateAccessToken(mockPayload)
      const remainingTime = JwtService.getTokenRemainingTime(token)
      
      expect(remainingTime).toBeGreaterThan(0)
      expect(remainingTime).toBeLessThanOrEqual(15 * 60) // 15分钟
    })

    it('should return 0 for invalid token', () => {
      const remainingTime = JwtService.getTokenRemainingTime('invalid.token')
      expect(remainingTime).toBe(0)
    })

    it('should return 0 for expired token', () => {
      // 模拟过期token
      const token = JwtService.generateAccessToken(mockPayload)
      
      const originalDate = Date.now
      Date.now = jest.fn(() => originalDate() + 20 * 60 * 1000) // 20分钟后
      
      try {
        const remainingTime = JwtService.getTokenRemainingTime(token)
        expect(remainingTime).toBe(0)
      } finally {
        Date.now = originalDate
      }
    })
  })

  describe('isTokenExpiringSoon', () => {
    it('should return false for fresh token', () => {
      const token = JwtService.generateAccessToken(mockPayload)
      const isExpiringSoon = JwtService.isTokenExpiringSoon(token)
      
      expect(isExpiringSoon).toBe(false)
    })

    it('should return true for token expiring soon', () => {
      const token = JwtService.generateAccessToken(mockPayload)
      
      // 模拟时间前进到接近过期
      const originalDate = Date.now
      Date.now = jest.fn(() => originalDate() + 12 * 60 * 1000) // 12分钟后（还剩3分钟）
      
      try {
        const isExpiringSoon = JwtService.isTokenExpiringSoon(token)
        expect(isExpiringSoon).toBe(true)
      } finally {
        Date.now = originalDate
      }
    })

    it('should return true for expired token', () => {
      const token = JwtService.generateAccessToken(mockPayload)
      
      const originalDate = Date.now
      Date.now = jest.fn(() => originalDate() + 20 * 60 * 1000) // 20分钟后
      
      try {
        const isExpiringSoon = JwtService.isTokenExpiringSoon(token)
        expect(isExpiringSoon).toBe(true)
      } finally {
        Date.now = originalDate
      }
    })
  })

  describe('generateTokenPair', () => {
    it('should generate both access and refresh tokens', () => {
      const tokenPair = JwtService.generateTokenPair(mockPayload)
      
      expect(tokenPair.accessToken).toBeDefined()
      expect(tokenPair.refreshToken).toBeDefined()
      expect(tokenPair.expiresIn).toBeGreaterThan(0)
      
      // 验证tokens有效性
      const accessDecoded = JwtService.verifyAccessToken(tokenPair.accessToken)
      const refreshDecoded = JwtService.verifyRefreshToken(tokenPair.refreshToken)
      
      expect(accessDecoded.userId).toBe(mockPayload.userId)
      expect(refreshDecoded.userId).toBe(mockPayload.userId)
    })
  })

  describe('error handling', () => {
    it('should throw AuthError with correct type for invalid credentials', () => {
      try {
        JwtService.verifyAccessToken('invalid.token')
      } catch (error) {
        expect(error).toBeInstanceOf(AuthError)
        expect((error as AuthError).type).toBe(AuthErrorType.INVALID_TOKEN)
      }
    })

    it('should handle missing environment variables', () => {
      const originalSecret = process.env.JWT_SECRET
      delete process.env.JWT_SECRET
      
      try {
        expect(() => {
          JwtService.generateAccessToken(mockPayload)
        }).toThrow('JWT_SECRET environment variable is required')
      } finally {
        process.env.JWT_SECRET = originalSecret
      }
    })
  })
})
