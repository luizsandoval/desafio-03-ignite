import { createContext, ReactNode, useContext, useState } from 'react';
import { toast } from 'react-toastify';

import { api } from '../services/api';
import { Product, Stock } from '../types';

interface CartProviderProps {
    children: ReactNode;
}

interface UpdateProductAmount {
    productId: number;
    amount: number;
}

interface CartContextData {
    cart: Product[];
    addProduct: (productId: number) => Promise<void>;
    removeProduct: (productId: number) => void;
    updateProductAmount: ({ productId, amount }: UpdateProductAmount) => void;
}

const CartContext = createContext<CartContextData>({} as CartContextData);

const CART_KEY = '@RocketShoes:cart';

export function CartProvider({ children }: CartProviderProps): JSX.Element {
    const [cart, setCart] = useState<Product[]>(() => {
        const storagedCart = localStorage.getItem(CART_KEY);

        if (storagedCart) return JSON.parse(storagedCart);

        return [];
    });

    const addProduct = async (productId: number) => {
        try {
            const productInCart = cart.find(
                (product) => product.id === productId
            );

            const desiredAmount = productInCart ? productInCart.amount + 1 : 1;

            const { data: productStock } = await api.get<Stock>(
                `/stock/${productId}`
            );

            if (desiredAmount > productStock?.amount) {
                toast.error('Quantidade solicitada fora de estoque');
                return;
            }

            const { data: product } = await api.get<Product>(
                `/products/${productId}`
            );

            const updatedCart = productInCart
                ? cart.map((product) =>
                      product.id === productId
                          ? { ...product, amount: product.amount + 1 }
                          : product
                  )
                : [...cart, { ...product, amount: 1 }];

            setCart(updatedCart);

            localStorage.setItem(CART_KEY, JSON.stringify(updatedCart));
        } catch {
            toast.error('Erro na adição do produto');
        }
    };

    const removeProduct = (productId: number) => {
        try {
            const productExists = cart.some(
                (product) => product.id === productId
            );

            if (!productExists) throw Error();

            const updatedCart = cart.filter(
                (product) => product.id !== productId
            );

            setCart(updatedCart);

            localStorage.setItem(CART_KEY, JSON.stringify(updatedCart));
        } catch {
            toast.error('Erro na remoção do produto');
        }
    };

    const updateProductAmount = async ({
        productId,
        amount,
    }: UpdateProductAmount) => {
        try {
            if (amount <= 0) return;

            const { data: productStock } = await api.get<Stock>(
                `/stock/${productId}`
            );

            if (amount > productStock.amount)
                return toast.error('Quantidade solicitada fora de estoque');

            const updatedCart = cart.map((product) =>
                product.id === productId ? { ...product, amount } : product
            );

            setCart(updatedCart);

            localStorage.setItem(CART_KEY, JSON.stringify(updatedCart));
        } catch {
            toast.error('Erro na alteração de quantidade do produto');
        }
    };

    return (
        <CartContext.Provider
            value={{ cart, addProduct, removeProduct, updateProductAmount }}
        >
            {children}
        </CartContext.Provider>
    );
}

export function useCart(): CartContextData {
    const context = useContext(CartContext);

    return context;
}
