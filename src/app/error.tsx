'use client';

import { useEffect } from 'react';
import { Box, Button, Heading, Text, VStack } from '@chakra-ui/react';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // エラーをログに記録する
    console.error('アプリケーションエラーが発生しました:', error);
  }, [error]);

  return (
    <Box
      minH="100vh"
      display="flex"
      alignItems="center"
      justifyContent="center"
      p={4}
      bg="gray.50"
    >
      <VStack spacing={6} maxW="500px" textAlign="center">
        <Heading size="xl" color="red.500">エラーが発生しました</Heading>
        <Text fontSize="lg">
          申し訳ありませんが、予期せぬエラーが発生しました。
        </Text>
        <Text fontSize="md" color="gray.600">
          {error.message || 'エラーの詳細は開発者コンソールを確認してください。'}
        </Text>
        <Button
          colorScheme="blue"
          size="lg"
          onClick={reset}
        >
          もう一度試す
        </Button>
      </VStack>
    </Box>
  );
} 