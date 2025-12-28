import { Router } from 'express';
import { PayableController } from '../controllers/payableController';
import { authenticateToken } from '../middleware/authMiddleware';
import { injectDataPermission, filterResponseFields } from '../middleware/permissionMiddleware';

const router = Router();

// 所有路由需要认证
router.use(authenticateToken);

/**
 * @swagger
 * /api/v1/bases/{baseId}/payables:
 *   get:
 *     summary: 获取应付列表
 *     tags: [Payable]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: baseId
 *         required: true
 *         schema:
 *           type: integer
 *         description: 基地ID
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
 *           default: 20
 *         description: 每页数量
 *       - in: query
 *         name: purchaseName
 *         schema:
 *           type: string
 *         description: 采购名称搜索
 *       - in: query
 *         name: supplierName
 *         schema:
 *           type: string
 *         description: 供应商名称搜索
 *       - in: query
 *         name: unpaidOnly
 *         schema:
 *           type: boolean
 *         description: 只显示未付清的
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *         description: 开始日期
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *         description: 结束日期
 *     responses:
 *       200:
 *         description: 获取成功
 */
router.get('/:baseId/payables', injectDataPermission('payable'), filterResponseFields(), PayableController.getPayableList);

/**
 * @swagger
 * /api/v1/bases/{baseId}/payables/{id}:
 *   get:
 *     summary: 获取应付详情
 *     tags: [Payable]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: baseId
 *         required: true
 *         schema:
 *           type: integer
 *         description: 基地ID
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: 采购单ID
 *     responses:
 *       200:
 *         description: 获取成功
 */
router.get('/:baseId/payables/:id', injectDataPermission('payable'), filterResponseFields(), PayableController.getPayableDetail);

/**
 * @swagger
 * /api/v1/bases/{baseId}/payables/{id}/payment:
 *   post:
 *     summary: 添加付款
 *     tags: [Payable]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: baseId
 *         required: true
 *         schema:
 *           type: integer
 *         description: 基地ID
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: 采购单ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - paymentAmount
 *             properties:
 *               paymentAmount:
 *                 type: number
 *                 description: 付款金额
 *     responses:
 *       200:
 *         description: 付款成功
 */
router.post('/:baseId/payables/:id/payment', PayableController.addPayment);

export default router;
