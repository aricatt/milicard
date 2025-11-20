import type { Request, Response } from 'express';
import type { BaseItem, BaseListResponse } from './data.d';

// 模拟数据
const mockBases: BaseItem[] = [
  {
    id: 1,
    code: 'BASE-83Q6731DP7J',
    name: '火山基地',
    createdAt: '2025-01-15T10:30:00Z',
  },
  {
    id: 2,
    code: 'BASE-92H8K41FP2M',
    name: '杭州基地',
    createdAt: '2025-01-16T14:20:00Z',
  },
  {
    id: 3,
    code: 'BASE-74L9N63QR8X',
    name: '上海基地',
    createdAt: '2025-01-17T09:15:00Z',
  },
];

let currentId = 4;

function queryBaseList(req: Request, res: Response) {
  const { current = 1, pageSize = 10, name, code } = req.query;
  
  let filteredBases = [...mockBases];
  
  // 模拟搜索过滤
  if (name) {
    filteredBases = filteredBases.filter(base => 
      base.name.toLowerCase().includes((name as string).toLowerCase())
    );
  }
  
  if (code) {
    filteredBases = filteredBases.filter(base => 
      base.code.toLowerCase().includes((code as string).toLowerCase())
    );
  }
  
  // 模拟分页
  const start = ((current as number) - 1) * (pageSize as number);
  const end = start + (pageSize as number);
  const data = filteredBases.slice(start, end);
  
  const response: BaseListResponse = {
    data,
    total: filteredBases.length,
    success: true,
  };
  
  res.json(response);
}

function addBase(req: Request, res: Response) {
  const { code, name } = req.body;
  
  const newBase: BaseItem = {
    id: currentId++,
    code,
    name,
    createdAt: new Date().toISOString(),
  };
  
  mockBases.push(newBase);
  
  res.json({ success: true, data: newBase });
}

function updateBase(req: Request, res: Response) {
  const { id } = req.params;
  const { code, name } = req.body;
  
  const baseIndex = mockBases.findIndex(base => base.id === parseInt(id));
  
  if (baseIndex === -1) {
    res.status(404).json({ success: false, message: '基地不存在' });
    return;
  }
  
  mockBases[baseIndex] = {
    ...mockBases[baseIndex],
    code: code || mockBases[baseIndex].code,
    name: name || mockBases[baseIndex].name,
  };
  
  res.json({ success: true, data: mockBases[baseIndex] });
}

function removeBase(req: Request, res: Response) {
  const { id } = req.params;
  
  const baseIndex = mockBases.findIndex(base => base.id === parseInt(id));
  
  if (baseIndex === -1) {
    res.status(404).json({ success: false, message: '基地不存在' });
    return;
  }
  
  mockBases.splice(baseIndex, 1);
  
  res.json({ success: true });
}

function getBase(req: Request, res: Response) {
  const { id } = req.params;
  
  const base = mockBases.find(base => base.id === parseInt(id));
  
  if (!base) {
    res.status(404).json({ success: false, message: '基地不存在' });
    return;
  }
  
  res.json({ success: true, data: base });
}

export default {
  'GET /api/v1/live-base/bases': queryBaseList,
  'POST /api/v1/live-base/bases': addBase,
  'PUT /api/v1/live-base/bases/:id': updateBase,
  'DELETE /api/v1/live-base/bases/:id': removeBase,
  'GET /api/v1/live-base/bases/:id': getBase,
};
