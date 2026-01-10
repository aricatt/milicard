export interface CreatePointVisitRequest {
  pointId: string;
  visitorName: string;
  customerName?: string;
  latitude?: number;
  longitude?: number;
  locationName?: string;
  notes?: string;
}

export interface UpdatePointVisitRequest {
  visitorName?: string;
  customerName?: string;
  latitude?: number;
  longitude?: number;
  locationName?: string;
  notes?: string;
}

export interface PointVisitResponse {
  id: string;
  pointId: string;
  visitDate: Date;
  visitorName: string;
  customerName?: string;
  latitude?: number;
  longitude?: number;
  locationName?: string;
  images: string[];
  notes?: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
  creator?: {
    id: string;
    name: string;
    username: string;
  };
  point?: {
    id: string;
    code: string;
    name: string;
  };
}

export interface PointVisitListQuery {
  pointId: string;
  page?: number;
  limit?: number;
  startDate?: string;
  endDate?: string;
}
