import { redirect } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { FaChalkboardTeacher, FaClipboardList, FaGraduationCap, FaUsers } from 'react-icons/fa';

export default function Home() {
  // トレーナーページにリダイレクト
  redirect('/trainer');
  
  // リダイレクトが働かない場合のフォールバック
  return null;
} 