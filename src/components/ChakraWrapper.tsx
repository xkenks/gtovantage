'use client';

import { ChakraProvider, createSystem } from '@chakra-ui/react';
import { ReactNode } from 'react';

interface ChakraWrapperProps {
  children: ReactNode;
}

export function ChakraWrapper({ children }: ChakraWrapperProps) {
  // Chakra UI v3では独自のシステムを作成する必要があります
  const system = createSystem({});
  
  return (
    <ChakraProvider value={system}>
      {children}
    </ChakraProvider>
  );
} 