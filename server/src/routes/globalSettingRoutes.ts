import { Router } from 'express';
import { GlobalSettingController } from '../controllers/globalSettingController';
import { authenticateToken } from '../middleware/authMiddleware';
import { checkSystemPermission, injectDataPermission, filterResponseFields } from '../middleware/permissionMiddleware';

const router = Router();

// 所有路由都需要认证
router.use(authenticateToken);

// 获取所有分类
router.get('/categories', checkSystemPermission('global_setting', 'read'), GlobalSettingController.getCategories);

// 根据 key 获取配置值（仅返回 value）- 允许所有登录用户访问
router.get('/value/:key', GlobalSettingController.getValue);

// 批量获取配置值 - 允许所有登录用户访问
router.post('/values/batch', GlobalSettingController.getValues);

// 批量设置配置值
router.post('/values/batch-set', checkSystemPermission('global_setting', 'update'), GlobalSettingController.setValues);

// 根据 key 获取配置（完整信息）
router.get('/key/:key', checkSystemPermission('global_setting', 'read'), injectDataPermission('global_setting'), filterResponseFields(), GlobalSettingController.getByKey);

// 获取配置列表
router.get('/', checkSystemPermission('global_setting', 'read'), injectDataPermission('global_setting'), filterResponseFields(), GlobalSettingController.getList);

// 根据 ID 获取配置
router.get('/:id', checkSystemPermission('global_setting', 'read'), injectDataPermission('global_setting'), filterResponseFields(), GlobalSettingController.getById);

// 创建配置
router.post('/', checkSystemPermission('global_setting', 'create'), GlobalSettingController.create);

// 更新配置
router.put('/:id', checkSystemPermission('global_setting', 'update'), GlobalSettingController.update);

// 删除配置
router.delete('/:id', checkSystemPermission('global_setting', 'delete'), GlobalSettingController.delete);

export default router;
