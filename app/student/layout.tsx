// app/student/layout.tsx
import StudentSidebar from '@/components/StudentSidebar';
import styles from './student-layout.module.css';

export default function StudentRootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className={styles.layoutContainer}>
      <StudentSidebar />
      <main className={styles.mainContent}>
        {children}
      </main>
    </div>
  );
}
