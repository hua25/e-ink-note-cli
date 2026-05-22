export interface CreateTodoRequest {
  title: string;
  description?: string;
  dueDate?: string;
  dueTime?: string;
  repeatType?: string;
  repeatWeekday?: number;
  repeatMonth?: number;
  repeatDay?: number;
  priority?: number;
  deviceId?: string;
}

export interface UpdateTodoRequest {
  title?: string;
  description?: string;
  dueDate?: string;
  dueTime?: string;
  priority?: number;
}

export interface TextDisplayRequest {
  text: string;
  fontSize?: number;
  pageId?: string;
}

export interface StructuredTextRequest {
  title?: string;
  body?: string;
  pageId?: string;
}
