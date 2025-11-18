"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const prisma = new client_1.PrismaClient();
async function main() {
    console.log('🌱 开始数据库种子数据初始化...');
    // 创建系统角色
    const roles = [
        {
            name: '超级管理员',
            nameKey: 'role.super_admin',
            description: '系统最高权限，可以管理所有功能',
            descriptionKey: 'role.super_admin.description',
            permissions: ['*'],
            isSystem: true
        },
        {
            name: '老板',
            nameKey: 'role.boss',
            description: '业务最高权限，可查看所有业务数据',
            descriptionKey: 'role.boss.description',
            permissions: [
                'inventory:*',
                'sales:*',
                'finance:*',
                'system:user:view',
                'system:role:view'
            ],
            isSystem: true
        },
        {
            name: '财务',
            nameKey: 'role.finance',
            description: '财务人员权限，可查看价格成本和管理财务',
            descriptionKey: 'role.finance.description',
            permissions: [
                'inventory:goods:view:price',
                'inventory:goods:view:cost',
                'inventory:purchase:view',
                'sales:distribution:view',
                'sales:stockout:view',
                'finance:*'
            ],
            isSystem: true
        },
        {
            name: '仓管',
            nameKey: 'role.warehouse_manager',
            description: '仓库管理员权限，负责库存和物流管理',
            descriptionKey: 'role.warehouse_manager.description',
            permissions: [
                'inventory:goods:view:basic',
                'inventory:goods:create',
                'inventory:goods:edit:basic',
                'inventory:purchase:*',
                'inventory:arrival:*',
                'inventory:transfer:*',
                'sales:stockout:*'
            ],
            isSystem: true
        },
        {
            name: '主播',
            nameKey: 'role.anchor',
            description: '主播权限，管理自己的库存消耗和利润',
            descriptionKey: 'role.anchor.description',
            permissions: [
                'inventory:goods:view:basic',
                'inventory:consumption:*',
                'inventory:transfer:view:own',
                'finance:profit:view:own',
                'finance:profit:edit:own'
            ],
            isSystem: true
        }
    ];
    for (const roleData of roles) {
        await prisma.role.upsert({
            where: { name: roleData.name },
            update: {},
            create: roleData
        });
    }
    console.log('✅ 系统角色创建完成');
    // 创建默认管理员用户
    const hashedPassword = await bcryptjs_1.default.hash('admin123', 10);
    const adminUser = await prisma.user.upsert({
        where: { username: 'admin' },
        update: {},
        create: {
            username: 'admin',
            email: 'admin@milicard.com',
            passwordHash: hashedPassword,
            name: '系统管理员',
            isActive: true
        }
    });
    // 给管理员分配超级管理员角色
    const superAdminRole = await prisma.role.findUnique({
        where: { name: '超级管理员' }
    });
    if (superAdminRole) {
        await prisma.userRole.upsert({
            where: {
                uk_user_role_active: {
                    userId: adminUser.id,
                    roleId: superAdminRole.id,
                    isActive: true
                }
            },
            update: {},
            create: {
                userId: adminUser.id,
                roleId: superAdminRole.id,
                assignedBy: adminUser.id,
                isActive: true
            }
        });
    }
    console.log('✅ 默认管理员用户创建完成');
    // 创建示例地点
    const warehouse = await prisma.location.upsert({
        where: { id: 'warehouse-001' },
        update: {},
        create: {
            id: 'warehouse-001',
            name: '主仓库',
            type: 'WAREHOUSE',
            description: '公司主要仓库',
            address: '北京市朝阳区示例地址123号',
            contactPerson: '张三',
            contactPhone: '13800138000'
        }
    });
    const liveRoom = await prisma.location.upsert({
        where: { id: 'liveroom-001' },
        update: {},
        create: {
            id: 'liveroom-001',
            name: '直播间A',
            type: 'LIVE_ROOM',
            description: '主播小王的直播间',
            contactPerson: '小王',
            contactPhone: '13900139000'
        }
    });
    console.log('✅ 示例地点创建完成');
    // 创建示例客户
    await prisma.customer.upsert({
        where: { id: 'customer-001' },
        update: {},
        create: {
            id: 'customer-001',
            name: '示例客户A',
            contactPerson: '李四',
            phone: '13700137000',
            email: 'customer@example.com',
            address: '上海市浦东新区示例路456号'
        }
    });
    console.log('✅ 示例客户创建完成');
    // 创建示例商品
    await prisma.goods.upsert({
        where: { code: 'GOODS-001' },
        update: {},
        create: {
            code: 'GOODS-001',
            name: 'iPhone 15 Pro',
            description: '苹果iPhone 15 Pro 256GB 深空黑色',
            retailPrice: 8999.00,
            purchasePrice: 7500.00,
            packPerBox: 20,
            piecePerPack: 1,
            notes: '热销商品'
        }
    });
    await prisma.goods.upsert({
        where: { code: 'GOODS-002' },
        update: {},
        create: {
            code: 'GOODS-002',
            name: '小米14',
            description: '小米14 12GB+256GB 白色',
            retailPrice: 3999.00,
            purchasePrice: 3200.00,
            packPerBox: 30,
            piecePerPack: 1,
            notes: '性价比商品'
        }
    });
    console.log('✅ 示例商品创建完成');
    console.log('🎉 数据库种子数据初始化完成！');
    console.log('📋 默认管理员账号：');
    console.log('   用户名：admin');
    console.log('   密码：admin123');
}
main()
    .catch((e) => {
    console.error('❌ 种子数据初始化失败:', e);
    process.exit(1);
})
    .finally(async () => {
    await prisma.$disconnect();
});
