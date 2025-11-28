import { Router } from 'express';
import { BaseController } from '../controllers/baseController';
import { authenticateToken } from '../middleware/authMiddleware';

const router = Router();

// 启用认证中间件
router.use(authenticateToken);

/**
 * @swagger
 * /api/v1/live-base/bases:
 *   get:
 *     summary: 获取基地列表
 *     tags: [Base]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: current
 *         schema:
 *           type: integer
 *           default: 1
 *         description: 当前页码
 *       - in: query
 *         name: pageSize
 *         schema:
 *           type: integer
 *           default: 10
 *         description: 每页数量
 *       - in: query
 *         name: name
 *         schema:
 *           type: string
 *         description: 基地名称搜索
 *       - in: query
 *         name: code
 *         schema:
 *           type: string
 *         description: 基地编号搜索
 *     responses:
 *       200:
 *         description: 获取成功
 *       401:
 *         description: 未认证
 *       403:
 *         description: 权限不足
 */
router.get('/', BaseController.getBaseList);

/**
 * @swagger
 * /api/v1/live-base/bases/{id}:
 *   get:
 *     summary: 获取基地详情
 *     tags: [Base]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: 基地ID
 *     responses:
 *       200:
 *         description: 获取成功
 *       404:
 *         description: 基地不存在
 */
router.get('/:id', BaseController.getBaseById);

/**
 * @swagger
 * /api/v1/live-base/bases:
 *   post:
 *     summary: 创建基地
 *     tags: [Base]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - code
 *               - name
 *             properties:
 *               code:
 *                 type: string
 *                 description: 基地编号
 *               name:
 *                 type: string
 *                 description: 基地名称
 *     responses:
 *       201:
 *         description: 创建成功
 *       400:
 *         description: 请求参数错误
 *       409:
 *         description: 基地编号已存在
 */
router.post('/', BaseController.createBase);

/**
 * @swagger
 * /api/v1/live-base/bases/{id}:
 *   put:
 *     summary: 更新基地
 *     tags: [Base]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: 基地ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               code:
 *                 type: string
 *                 description: 基地编号
 *               name:
 *                 type: string
 *                 description: 基地名称
 *     responses:
 *       200:
 *         description: 更新成功
 *       404:
 *         description: 基地不存在
 *       409:
 *         description: 基地编号已存在
 */
router.put('/:id', BaseController.updateBase);

/**
 * @swagger
 * /api/v1/live-base/bases/{id}:
 *   delete:
 *     summary: 删除基地
 *     tags: [Base]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: 基地ID
 *     responses:
 *       200:
 *         description: 删除成功
 *       404:
 *         description: 基地不存在
 */
router.delete('/:id', BaseController.deleteBase);

export default router;
