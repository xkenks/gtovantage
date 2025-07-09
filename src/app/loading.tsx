'use client';

import { Box, Spinner, Text, VStack } from '@chakra-ui/react';

export default function Loading() {
  return (
    <Box
      minH="100vh"
      display="flex"
      alignItems="center"
      justifyContent="center"
      p={4}
      bg="gray.50"
    >
      <VStack spacing={4}>
        <Spinner
          thickness="4px"
          speed="0.65s"
          emptyColor="gray.200"
          color="blue.500"
          size="xl"
        />
        <Text fontSize="lg" fontWeight="medium">
          読み込み中...
        </Text>
      </VStack>
    </Box>
  );
} 