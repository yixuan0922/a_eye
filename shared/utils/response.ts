import { ApiResponse, PaginatedResponse } from '../types';

export const successResponse = <T>(data: T, message?: string): ApiResponse<T> => {
  return {
    success: true,
    data,
    message,
  };
};

export const errorResponse = (error: string, statusCode: number = 500): ApiResponse => {
  return {
    success: false,
    error,
  };
};

export const paginatedResponse = <T>(
  data: T[],
  total: number,
  page: number,
  limit: number
): PaginatedResponse<T> => {
  return {
    success: true,
    data,
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    },
  };
};
