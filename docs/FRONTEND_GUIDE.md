# Frontend Integration Guide - Backend CRM Elite

Guía completa para desarrolladores frontend que integren con este backend. Incluye ejemplos de código, hooks, gestión de estado y mejores prácticas.

## 📋 Tabla de Contenidos

- [Setup Inicial](#setup-inicial)
- [Autenticación](#autenticación)
- [Gestión de Estado](#gestión-de-estado)
- [API Client](#api-client)
- [Hooks Personalizados](#hooks-personalizados)
- [Tipos TypeScript](#tipos-typescript)
- [Ejemplos de Componentes](#ejemplos-de-componentes)
- [Manejo de Errores](#manejo-de-errores)
- [Mejores Prácticas](#mejores-prácticas)

---

## 🚀 Setup Inicial

### Variables de Entorno

Crea un archivo `.env` en la raíz de tu proyecto frontend:

```env
VITE_API_BASE_URL=http://localhost:3000/api
VITE_API_TIMEOUT=30000
```

### Instalación de Dependencias

```bash
npm install axios
npm install @tanstack/react-query  # Recomendado para data fetching
npm install zustand                # O Redux Toolkit para state management
```

---

## 🔐 Autenticación

### Estructura de Tokens

El backend retorna dos tokens:
- **accessToken**: Válido por 15 minutos, usar para requests
- **refreshToken**: Válido por 7 días, usar para renovar accessToken

### API Client con Interceptores

```typescript
// src/lib/apiClient.ts
import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api';

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor para añadir token automáticamente
apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = localStorage.getItem('accessToken');
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Interceptor para manejar token expirado
let isRefreshing = false;
let failedQueue: Array<{
  resolve: (token: string) => void;
  reject: (error: any) => void;
}> = [];

const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token!);
    }
  });
  failedQueue = [];
};

apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & {
      _retry?: boolean;
    };

    // Si es error 401 y no es ruta de login/refresh
    if (
      error.response?.status === 401 &&
      !originalRequest._retry &&
      !originalRequest.url?.includes('/login') &&
      !originalRequest.url?.includes('/refresh')
    ) {
      if (isRefreshing) {
        // Si ya estamos refrescando, poner en cola
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            return apiClient(originalRequest);
          })
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      const refreshToken = localStorage.getItem('refreshToken');

      if (!refreshToken) {
        // No hay refresh token, redirigir a login
        processQueue(error, null);
        window.location.href = '/login';
        return Promise.reject(error);
      }

      try {
        const response = await axios.post(`${API_BASE_URL}/users/refresh`, {
          refreshToken,
        });

        const { accessToken, refreshToken: newRefreshToken } = response.data;

        localStorage.setItem('accessToken', accessToken);
        localStorage.setItem('refreshToken', newRefreshToken);

        apiClient.defaults.headers.common.Authorization = `Bearer ${accessToken}`;
        originalRequest.headers.Authorization = `Bearer ${accessToken}`;

        processQueue(null, accessToken);
        isRefreshing = false;

        return apiClient(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError, null);
        isRefreshing = false;

        // Refresh falló, limpiar tokens y redirigir
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        window.location.href = '/login';

        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

export default apiClient;
```

### Servicio de Autenticación

```typescript
// src/services/authService.ts
import apiClient from '@/lib/apiClient';

export interface LoginCredentials {
  username: string;
  password: string;
}

export interface RegisterData {
  username: string;
  password: string;
  firstName: string;
  lastName: string;
  role: 'administrador' | 'coordinador' | 'verificador' | 'comercial';
}

export interface User {
  id: string;
  username: string;
  firstName: string;
  lastName: string;
  role: string;
  lastLoginAt?: string;
}

export interface AuthResponse {
  user: User;
  accessToken: string;
  refreshToken: string;
}

export const authService = {
  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    const response = await apiClient.post<AuthResponse>('/users/login', credentials);

    // Guardar tokens
    localStorage.setItem('accessToken', response.data.accessToken);
    localStorage.setItem('refreshToken', response.data.refreshToken);
    localStorage.setItem('user', JSON.stringify(response.data.user));

    return response.data;
  },

  async register(data: RegisterData): Promise<AuthResponse> {
    const response = await apiClient.post<AuthResponse>('/users/register', data);

    // Guardar tokens
    localStorage.setItem('accessToken', response.data.accessToken);
    localStorage.setItem('refreshToken', response.data.refreshToken);
    localStorage.setItem('user', JSON.stringify(response.data.user));

    return response.data;
  },

  async logout(): Promise<void> {
    const user = authService.getCurrentUser();

    if (user) {
      await apiClient.post('/users/logout', { userId: user.id });
    }

    // Limpiar tokens
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
  },

  getCurrentUser(): User | null {
    const userStr = localStorage.getItem('user');
    return userStr ? JSON.parse(userStr) : null;
  },

  isAuthenticated(): boolean {
    return !!localStorage.getItem('accessToken');
  },

  hasRole(role: string | string[]): boolean {
    const user = authService.getCurrentUser();
    if (!user) return false;

    const roles = Array.isArray(role) ? role : [role];
    return roles.includes(user.role);
  },
};
```

---

## 🗂️ Gestión de Estado

### Opción 1: Zustand (Recomendado)

```typescript
// src/stores/authStore.ts
import { create } from 'zustand';
import { authService, User } from '@/services/authService';

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;

  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  checkAuth: () => void;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: authService.getCurrentUser(),
  isAuthenticated: authService.isAuthenticated(),
  isLoading: false,
  error: null,

  login: async (username, password) => {
    set({ isLoading: true, error: null });
    try {
      const response = await authService.login({ username, password });
      set({
        user: response.user,
        isAuthenticated: true,
        isLoading: false,
      });
    } catch (error: any) {
      set({
        error: error.response?.data?.message || 'Error al iniciar sesión',
        isLoading: false,
      });
      throw error;
    }
  },

  logout: async () => {
    set({ isLoading: true });
    try {
      await authService.logout();
      set({
        user: null,
        isAuthenticated: false,
        isLoading: false,
      });
    } catch (error) {
      console.error('Error during logout:', error);
      set({ isLoading: false });
    }
  },

  checkAuth: () => {
    const user = authService.getCurrentUser();
    const isAuthenticated = authService.isAuthenticated();
    set({ user, isAuthenticated });
  },

  clearError: () => set({ error: null }),
}));
```

### Opción 2: Redux Toolkit

```typescript
// src/store/slices/authSlice.ts
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { authService } from '@/services/authService';

export const login = createAsyncThunk(
  'auth/login',
  async ({ username, password }: { username: string; password: string }) => {
    const response = await authService.login({ username, password });
    return response;
  }
);

export const logout = createAsyncThunk('auth/logout', async () => {
  await authService.logout();
});

const authSlice = createSlice({
  name: 'auth',
  initialState: {
    user: authService.getCurrentUser(),
    isAuthenticated: authService.isAuthenticated(),
    isLoading: false,
    error: null as string | null,
  },
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(login.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(login.fulfilled, (state, action) => {
        state.user = action.payload.user;
        state.isAuthenticated = true;
        state.isLoading = false;
      })
      .addCase(login.rejected, (state, action) => {
        state.error = action.error.message || 'Error al iniciar sesión';
        state.isLoading = false;
      })
      .addCase(logout.fulfilled, (state) => {
        state.user = null;
        state.isAuthenticated = false;
      });
  },
});

export const { clearError } = authSlice.actions;
export default authSlice.reducer;
```

---

## 🎣 Hooks Personalizados

### Hook de Productos

```typescript
// src/hooks/useProducts.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '@/lib/apiClient';

export interface Product {
  id: string;
  name: string;
  description?: string;
  sku?: string;
  price: number;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateProductData {
  name: string;
  description?: string;
  sku?: string;
  price: number;
}

export const useProducts = () => {
  return useQuery({
    queryKey: ['products'],
    queryFn: async () => {
      const response = await apiClient.get<Product[]>('/products');
      return response.data;
    },
  });
};

export const useProduct = (id: string) => {
  return useQuery({
    queryKey: ['product', id],
    queryFn: async () => {
      const response = await apiClient.get<Product>(`/products/${id}`);
      return response.data;
    },
    enabled: !!id,
  });
};

export const useCreateProduct = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateProductData) => {
      const response = await apiClient.post<{ product: Product }>('/products', data);
      return response.data.product;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
    },
  });
};

export const useUpdateProduct = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<CreateProductData> }) => {
      const response = await apiClient.put<{ product: Product }>(`/products/${id}`, data);
      return response.data.product;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['product', variables.id] });
    },
  });
};

export const useToggleProductActive = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await apiClient.patch<{ product: Product }>(`/products/${id}/toggle`);
      return response.data.product;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
    },
  });
};

export const useDuplicateProduct = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await apiClient.post<{ product: Product }>(`/products/${id}/duplicate`);
      return response.data.product;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
    },
  });
};
```

### Hook de Ventas

```typescript
// src/hooks/useSales.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '@/lib/apiClient';

export interface SaleItem {
  id: string;
  productId?: string;
  name: string;
  quantity: number;
  price: number;
}

export interface Sale {
  id: string;
  clientId: string;
  statusId: string;
  userId: string;
  total: number;
  closedAt?: string;
  createdAt: string;
  updatedAt: string;
  items: SaleItem[];
  client?: {
    firstName: string;
    lastName: string;
    email?: string;
  };
  status?: {
    name: string;
    color?: string;
  };
}

export interface SaleFilters {
  clientId?: string;
  statusId?: string;
  from?: string;
  to?: string;
}

export interface CreateSaleData {
  clientId: string;
  items: Array<{
    productId?: string;
    name: string;
    quantity: number;
    price: number;
  }>;
}

export const useSales = (filters?: SaleFilters) => {
  return useQuery({
    queryKey: ['sales', filters],
    queryFn: async () => {
      const response = await apiClient.get<Sale[]>('/sales', { params: filters });
      return response.data;
    },
  });
};

export const useCreateSale = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateSaleData) => {
      const response = await apiClient.post<{ sale: Sale }>('/sales', data);
      return response.data.sale;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sales'] });
    },
  });
};

export const useAddSaleItem = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      saleId,
      item,
    }: {
      saleId: string;
      item: Omit<SaleItem, 'id'>;
    }) => {
      const response = await apiClient.post<{ sale: Sale }>(`/sales/${saleId}/items`, item);
      return response.data.sale;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sales'] });
    },
  });
};

export const useUpdateSaleItem = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      saleId,
      itemId,
      data,
    }: {
      saleId: string;
      itemId: string;
      data: Partial<Omit<SaleItem, 'id'>>;
    }) => {
      const response = await apiClient.put<{ sale: Sale }>(
        `/sales/${saleId}/items/${itemId}`,
        data
      );
      return response.data.sale;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sales'] });
    },
  });
};

export const useRemoveSaleItem = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ saleId, itemId }: { saleId: string; itemId: string }) => {
      const response = await apiClient.delete<{ sale: Sale }>(
        `/sales/${saleId}/items/${itemId}`
      );
      return response.data.sale;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sales'] });
    },
  });
};

export const useChangeSaleStatus = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ saleId, statusId }: { saleId: string; statusId: string }) => {
      const response = await apiClient.patch<{ sale: Sale }>(`/sales/${saleId}/status`, {
        statusId,
      });
      return response.data.sale;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sales'] });
    },
  });
};
```

### Hook de Clientes

```typescript
// src/hooks/useClients.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '@/lib/apiClient';

export interface Client {
  id: string;
  firstName: string;
  lastName: string;
  dni?: string;
  email?: string;
  birthday?: string;
  phones: string[];
  addresses: string[];
  bankAccounts: string[];
  comments: string[];
  authorized?: string;
  businessName?: string;
  createdAt: string;
  lastModified: string;
}

export interface CreateClientData {
  firstName: string;
  lastName: string;
  dni?: string;
  email?: string;
  birthday?: string;
  phones?: string[];
  addresses?: string[];
  businessName?: string;
}

export const useClient = (value: string) => {
  return useQuery({
    queryKey: ['client', value],
    queryFn: async () => {
      const response = await apiClient.get<Client | Client[]>(`/clients/${value}`);
      return response.data;
    },
    enabled: !!value,
  });
};

export const useCreateClient = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateClientData) => {
      const response = await apiClient.post<{ client: Client }>('/clients', data);
      return response.data.client;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['client'] });
    },
  });
};

export const useUpdateClient = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<CreateClientData> }) => {
      const response = await apiClient.put<{ client: Client }>(`/clients/${id}`, data);
      return response.data.client;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['client', variables.id] });
    },
  });
};

export const usePushClientData = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      field,
      value,
    }: {
      id: string;
      field: 'phones' | 'addresses' | 'comments' | 'bankAccounts';
      value: string;
    }) => {
      const response = await apiClient.post<{ client: Client }>(`/clients/${id}/push`, {
        field,
        value,
      });
      return response.data.client;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['client', variables.id] });
    },
  });
};
```

---

## 📦 Tipos TypeScript

```typescript
// src/types/index.ts

export type UserRole = 'administrador' | 'coordinador' | 'verificador' | 'comercial';

export interface User {
  id: string;
  username: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  lastLoginAt?: string;
}

export interface Product {
  id: string;
  name: string;
  description?: string;
  sku?: string;
  price: number;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Client {
  id: string;
  firstName: string;
  lastName: string;
  dni?: string;
  email?: string;
  birthday?: string;
  phones: string[];
  addresses: string[];
  bankAccounts: string[];
  comments: string[];
  authorized?: string;
  businessName?: string;
  createdAt: string;
  lastModified: string;
}

export interface SaleStatus {
  id: string;
  name: string;
  order: number;
  color?: string;
  isFinal: boolean;
}

export interface SaleItem {
  id: string;
  productId?: string;
  name: string;
  quantity: number;
  price: number;
}

export interface Sale {
  id: string;
  clientId: string;
  statusId: string;
  userId: string;
  total: number;
  closedAt?: string;
  createdAt: string;
  updatedAt: string;
  items: SaleItem[];
  client?: Pick<Client, 'firstName' | 'lastName' | 'email'>;
  status?: Pick<SaleStatus, 'name' | 'color'>;
  user?: Pick<User, 'firstName' | 'lastName'>;
}

export interface ApiError {
  message: string;
  errors?: Array<{
    field: string;
    message: string;
  }>;
}
```

---

## 🎨 Ejemplos de Componentes

### Componente de Login

```tsx
// src/components/auth/LoginForm.tsx
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';

export const LoginForm = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const { login, isLoading, error, clearError } = useAuthStore();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();

    try {
      await login(username, password);
      navigate('/dashboard');
    } catch (error) {
      // Error ya manejado por el store
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label htmlFor="username" className="block text-sm font-medium">
          Usuario
        </label>
        <input
          id="username"
          type="text"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          required
          className="mt-1 block w-full rounded-md border-gray-300"
        />
      </div>

      <div>
        <label htmlFor="password" className="block text-sm font-medium">
          Contraseña
        </label>
        <input
          id="password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          className="mt-1 block w-full rounded-md border-gray-300"
        />
      </div>

      {error && (
        <div className="rounded-md bg-red-50 p-4">
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      <button
        type="submit"
        disabled={isLoading}
        className="w-full rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:opacity-50"
      >
        {isLoading ? 'Iniciando sesión...' : 'Iniciar Sesión'}
      </button>
    </form>
  );
};
```

### Lista de Productos

```tsx
// src/components/products/ProductList.tsx
import { useProducts, useToggleProductActive } from '@/hooks/useProducts';
import { Loader, AlertCircle } from 'lucide-react';

export const ProductList = () => {
  const { data: products, isLoading, error } = useProducts();
  const toggleActive = useToggleProductActive();

  if (isLoading) {
    return (
      <div className="flex justify-center p-8">
        <Loader className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-md bg-red-50 p-4">
        <div className="flex">
          <AlertCircle className="h-5 w-5 text-red-400" />
          <div className="ml-3">
            <p className="text-sm text-red-800">Error al cargar productos</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
              Nombre
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
              SKU
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
              Precio
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
              Estado
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
              Acciones
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200 bg-white">
          {products?.map((product) => (
            <tr key={product.id}>
              <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-gray-900">
                {product.name}
              </td>
              <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                {product.sku || '-'}
              </td>
              <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                €{product.price.toFixed(2)}
              </td>
              <td className="whitespace-nowrap px-6 py-4 text-sm">
                <span
                  className={`inline-flex rounded-full px-2 text-xs font-semibold leading-5 ${
                    product.active
                      ? 'bg-green-100 text-green-800'
                      : 'bg-red-100 text-red-800'
                  }`}
                >
                  {product.active ? 'Activo' : 'Inactivo'}
                </span>
              </td>
              <td className="whitespace-nowrap px-6 py-4 text-sm font-medium">
                <button
                  onClick={() => toggleActive.mutate(product.id)}
                  disabled={toggleActive.isPending}
                  className="text-blue-600 hover:text-blue-900"
                >
                  {toggleActive.isPending ? 'Cambiando...' : 'Cambiar estado'}
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
```

### Formulario de Venta

```tsx
// src/components/sales/CreateSaleForm.tsx
import { useState } from 'react';
import { useCreateSale } from '@/hooks/useSales';
import { useProducts } from '@/hooks/useProducts';
import { useNavigate } from 'react-router-dom';

interface SaleItemInput {
  productId: string;
  name: string;
  quantity: number;
  price: number;
}

export const CreateSaleForm = ({ clientId }: { clientId: string }) => {
  const [items, setItems] = useState<SaleItemInput[]>([]);
  const [selectedProductId, setSelectedProductId] = useState('');
  const [quantity, setQuantity] = useState(1);

  const { data: products } = useProducts();
  const createSale = useCreateSale();
  const navigate = useNavigate();

  const selectedProduct = products?.find((p) => p.id === selectedProductId);

  const addItem = () => {
    if (!selectedProduct) return;

    const newItem: SaleItemInput = {
      productId: selectedProduct.id,
      name: selectedProduct.name,
      quantity,
      price: selectedProduct.price,
    };

    setItems([...items, newItem]);
    setSelectedProductId('');
    setQuantity(1);
  };

  const removeItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const calculateTotal = () => {
    return items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      await createSale.mutateAsync({
        clientId,
        items,
      });
      navigate('/sales');
    } catch (error) {
      console.error('Error creating sale:', error);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Selector de productos */}
      <div className="rounded-lg border p-4">
        <h3 className="mb-4 text-lg font-medium">Añadir Producto</h3>
        <div className="grid grid-cols-3 gap-4">
          <div className="col-span-2">
            <label className="block text-sm font-medium">Producto</label>
            <select
              value={selectedProductId}
              onChange={(e) => setSelectedProductId(e.target.value)}
              className="mt-1 block w-full rounded-md border-gray-300"
            >
              <option value="">Seleccionar producto...</option>
              {products
                ?.filter((p) => p.active)
                .map((product) => (
                  <option key={product.id} value={product.id}>
                    {product.name} - €{product.price.toFixed(2)}
                  </option>
                ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium">Cantidad</label>
            <input
              type="number"
              min="1"
              value={quantity}
              onChange={(e) => setQuantity(Number(e.target.value))}
              className="mt-1 block w-full rounded-md border-gray-300"
            />
          </div>
        </div>

        <button
          type="button"
          onClick={addItem}
          disabled={!selectedProduct}
          className="mt-4 rounded-md bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700 disabled:opacity-50"
        >
          Añadir Producto
        </button>
      </div>

      {/* Lista de items */}
      <div>
        <h3 className="mb-4 text-lg font-medium">Productos en la Venta</h3>
        {items.length === 0 ? (
          <p className="text-sm text-gray-500">No hay productos añadidos</p>
        ) : (
          <div className="space-y-2">
            {items.map((item, index) => (
              <div
                key={index}
                className="flex items-center justify-between rounded-lg border p-4"
              >
                <div>
                  <p className="font-medium">{item.name}</p>
                  <p className="text-sm text-gray-500">
                    {item.quantity} x €{item.price.toFixed(2)} = €
                    {(item.quantity * item.price).toFixed(2)}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => removeItem(index)}
                  className="text-red-600 hover:text-red-800"
                >
                  Eliminar
                </button>
              </div>
            ))}

            <div className="mt-4 flex justify-end border-t pt-4">
              <p className="text-xl font-bold">
                Total: €{calculateTotal().toFixed(2)}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Botones */}
      <div className="flex justify-end space-x-4">
        <button
          type="button"
          onClick={() => navigate('/sales')}
          className="rounded-md border px-4 py-2 text-sm hover:bg-gray-50"
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={items.length === 0 || createSale.isPending}
          className="rounded-md bg-green-600 px-4 py-2 text-sm text-white hover:bg-green-700 disabled:opacity-50"
        >
          {createSale.isPending ? 'Creando...' : 'Crear Venta'}
        </button>
      </div>

      {createSale.error && (
        <div className="rounded-md bg-red-50 p-4">
          <p className="text-sm text-red-800">Error al crear la venta</p>
        </div>
      )}
    </form>
  );
};
```

---

## ⚠️ Manejo de Errores

### Error Boundary

```tsx
// src/components/ErrorBoundary.tsx
import { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        this.props.fallback || (
          <div className="flex min-h-screen items-center justify-center">
            <div className="rounded-lg bg-red-50 p-8 text-center">
              <h2 className="text-2xl font-bold text-red-900">
                Algo salió mal
              </h2>
              <p className="mt-2 text-red-700">{this.state.error?.message}</p>
              <button
                onClick={() => window.location.reload()}
                className="mt-4 rounded-md bg-red-600 px-4 py-2 text-white"
              >
                Recargar Página
              </button>
            </div>
          </div>
        )
      );
    }

    return this.props.children;
  }
}
```

### Hook de Manejo de Errores

```typescript
// src/hooks/useErrorHandler.ts
import { AxiosError } from 'axios';
import { useCallback } from 'react';
import { toast } from 'react-hot-toast'; // o tu librería de notificaciones

export const useErrorHandler = () => {
  const handleError = useCallback((error: unknown) => {
    if (error instanceof AxiosError) {
      const message = error.response?.data?.message || 'Error en la operación';
      const status = error.response?.status;

      switch (status) {
        case 401:
          toast.error('No autorizado. Por favor, inicia sesión nuevamente.');
          // Opcional: redirigir al login
          break;
        case 403:
          toast.error('No tienes permisos para realizar esta acción.');
          break;
        case 404:
          toast.error('Recurso no encontrado.');
          break;
        case 409:
          toast.error(message);
          break;
        case 500:
          toast.error('Error del servidor. Inténtalo más tarde.');
          break;
        default:
          toast.error(message);
      }
    } else if (error instanceof Error) {
      toast.error(error.message);
    } else {
      toast.error('Error desconocido');
    }
  }, []);

  return { handleError };
};
```

---

## ✅ Mejores Prácticas

### 1. Protección de Rutas

```tsx
// src/components/auth/ProtectedRoute.tsx
import { Navigate } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';
import { authService } from '@/services/authService';

interface Props {
  children: React.ReactNode;
  allowedRoles?: string[];
}

export const ProtectedRoute = ({ children, allowedRoles }: Props) => {
  const { isAuthenticated, user } = useAuthStore();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && user && !allowedRoles.includes(user.role)) {
    return <Navigate to="/unauthorized" replace />;
  }

  return <>{children}</>;
};

// Uso:
// <Route path="/admin" element={
//   <ProtectedRoute allowedRoles={['administrador']}>
//     <AdminPanel />
//   </ProtectedRoute>
// } />
```

### 2. Optimistic Updates

```typescript
// Ejemplo con React Query
export const useUpdateSaleItem = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ saleId, itemId, data }) => {
      // ... la mutación
    },
    onMutate: async ({ saleId, itemId, data }) => {
      // Cancelar queries en progreso
      await queryClient.cancelQueries({ queryKey: ['sales'] });

      // Snapshot del estado anterior
      const previousSales = queryClient.getQueryData<Sale[]>(['sales']);

      // Optimistically update
      queryClient.setQueryData<Sale[]>(['sales'], (old) =>
        old?.map((sale) =>
          sale.id === saleId
            ? {
                ...sale,
                items: sale.items.map((item) =>
                  item.id === itemId ? { ...item, ...data } : item
                ),
              }
            : sale
        )
      );

      return { previousSales };
    },
    onError: (err, variables, context) => {
      // Rollback en caso de error
      if (context?.previousSales) {
        queryClient.setQueryData(['sales'], context.previousSales);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['sales'] });
    },
  });
};
```

### 3. Debounce en Búsquedas

```typescript
// src/hooks/useDebounce.ts
import { useEffect, useState } from 'react';

export const useDebounce = <T,>(value: T, delay: number = 500): T => {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
};

// Uso:
const [searchTerm, setSearchTerm] = useState('');
const debouncedSearchTerm = useDebounce(searchTerm, 500);

const { data: clients } = useClient(debouncedSearchTerm);
```

### 4. Validación con Zod (Frontend)

```typescript
// src/schemas/productSchema.ts
import { z } from 'zod';

export const createProductSchema = z.object({
  name: z.string().min(1, 'El nombre es requerido').max(200),
  description: z.string().max(1000).optional(),
  sku: z.string().max(100).optional(),
  price: z.number().positive('El precio debe ser positivo'),
});

export type CreateProductInput = z.infer<typeof createProductSchema>;

// Uso en formulario:
const handleSubmit = async (data: CreateProductInput) => {
  try {
    const validated = createProductSchema.parse(data);
    await createProduct.mutateAsync(validated);
  } catch (error) {
    if (error instanceof z.ZodError) {
      // Manejar errores de validación
      error.errors.forEach((err) => {
        toast.error(`${err.path}: ${err.message}`);
      });
    }
  }
};
```

---

## 🔧 Configuración React Query

```tsx
// src/lib/queryClient.ts
import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutos
      gcTime: 10 * 60 * 1000, // 10 minutos (antes cacheTime)
      retry: 1,
      refetchOnWindowFocus: false,
    },
    mutations: {
      retry: 0,
    },
  },
});

// src/main.tsx o App.tsx
import { QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { queryClient } from './lib/queryClient';

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      {/* Tu app */}
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  );
}
```

---

## 📚 Recursos Adicionales

- **[API Documentation](API.md)** - Referencia completa de endpoints
- **[Authentication Flow](AUTHENTICATION.md)** - Detalles del flujo de autenticación
- **React Query Docs**: https://tanstack.com/query/latest
- **Zustand Docs**: https://zustand-demo.pmnd.rs/
- **Axios Docs**: https://axios-http.com/

---

**¿Tienes preguntas?** Revisa la [API Documentation](API.md) o contacta al equipo de backend.
