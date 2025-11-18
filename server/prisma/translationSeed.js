"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
// 系统翻译数据
const systemTranslations = [
    // 角色翻译
    {
        key: 'role.super_admin',
        translations: {
            'zh-CN': '超级管理员',
            'en-US': 'Super Administrator',
            'vi-VN': 'Quản trị viên cấp cao',
            'th-TH': 'ผู้ดูแลระบบสูงสุด'
        },
        namespace: 'role',
        description: '系统最高权限角色'
    },
    {
        key: 'role.boss',
        translations: {
            'zh-CN': '老板',
            'en-US': 'Boss',
            'vi-VN': 'Ông chủ',
            'th-TH': 'เจ้านาย'
        },
        namespace: 'role',
        description: '业务最高权限角色'
    },
    {
        key: 'role.finance',
        translations: {
            'zh-CN': '财务',
            'en-US': 'Finance',
            'vi-VN': 'Tài chính',
            'th-TH': 'การเงิน'
        },
        namespace: 'role',
        description: '财务人员角色'
    },
    {
        key: 'role.warehouse_manager',
        translations: {
            'zh-CN': '仓管',
            'en-US': 'Warehouse Manager',
            'vi-VN': 'Quản lý kho',
            'th-TH': 'ผู้จัดการคลังสินค้า'
        },
        namespace: 'role',
        description: '仓库管理员角色'
    },
    {
        key: 'role.anchor',
        translations: {
            'zh-CN': '主播',
            'en-US': 'Anchor',
            'vi-VN': 'Người dẫn chương trình',
            'th-TH': 'พิธีกร'
        },
        namespace: 'role',
        description: '主播角色'
    },
    // 模块翻译
    {
        key: 'module.inventory',
        translations: {
            'zh-CN': '库存管理',
            'en-US': 'Inventory Management',
            'vi-VN': 'Quản lý tồn kho',
            'th-TH': 'การจัดการสินค้าคงคลัง'
        },
        namespace: 'module',
        description: '库存管理模块'
    },
    {
        key: 'module.sales',
        translations: {
            'zh-CN': '销售管理',
            'en-US': 'Sales Management',
            'vi-VN': 'Quản lý bán hàng',
            'th-TH': 'การจัดการการขาย'
        },
        namespace: 'module',
        description: '销售管理模块'
    },
    {
        key: 'module.finance',
        translations: {
            'zh-CN': '财务管理',
            'en-US': 'Finance Management',
            'vi-VN': 'Quản lý tài chính',
            'th-TH': 'การจัดการการเงิน'
        },
        namespace: 'module',
        description: '财务管理模块'
    },
    // 商品相关翻译
    {
        key: 'goods.name',
        translations: {
            'zh-CN': '商品名称',
            'en-US': 'Product Name',
            'vi-VN': 'Tên sản phẩm',
            'th-TH': 'ชื่อสินค้า'
        },
        namespace: 'goods',
        description: '商品名称字段'
    },
    {
        key: 'goods.code',
        translations: {
            'zh-CN': '商品编码',
            'en-US': 'Product Code',
            'vi-VN': 'Mã sản phẩm',
            'th-TH': 'รหัสสินค้า'
        },
        namespace: 'goods',
        description: '商品编码字段'
    },
    // 地点类型翻译
    {
        key: 'location.warehouse',
        translations: {
            'zh-CN': '仓库',
            'en-US': 'Warehouse',
            'vi-VN': 'Kho hàng',
            'th-TH': 'คลังสินค้า'
        },
        namespace: 'location',
        description: '仓库类型'
    },
    {
        key: 'location.live_room',
        translations: {
            'zh-CN': '直播间',
            'en-US': 'Live Room',
            'vi-VN': 'Phòng phát trực tiếp',
            'th-TH': 'ห้องไลฟ์สด'
        },
        namespace: 'location',
        description: '直播间类型'
    }
];
async function seedTranslations() {
    console.log('🌍 开始初始化翻译数据...');
    for (const item of systemTranslations) {
        for (const [language, value] of Object.entries(item.translations)) {
            await prisma.translation.upsert({
                where: {
                    key_language: {
                        key: item.key,
                        language: language
                    }
                },
                update: {
                    value,
                    namespace: item.namespace,
                    description: item.description
                },
                create: {
                    key: item.key,
                    language: language,
                    value: value,
                    namespace: item.namespace,
                    description: item.description,
                    isSystem: true,
                    reviewStatus: 'approved'
                }
            });
        }
        console.log(`✅ 翻译键 "${item.key}" 已创建`);
    }
    console.log('🎉 翻译数据初始化完成！');
}
exports.default = seedTranslations;
// 如果直接运行此文件
if (require.main === module) {
    seedTranslations()
        .catch((e) => {
        console.error('❌ 翻译数据初始化失败:', e);
        process.exit(1);
    })
        .finally(async () => {
        await prisma.$disconnect();
    });
}
