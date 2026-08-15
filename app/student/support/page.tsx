'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import styles from './tickets.module.css';

function normalizeText(value?: any): string {
  if (!value) return '';
  return String(value)
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/ي/g, 'ی')
    .replace(/ك/g, 'ک');
}

function parseAndNormalizeValues(value: any): string[] {
  if (!value) return [];
  let rawList: string[] = [];

  if (Array.isArray(value)) {
    rawList = value.map((v) => String(v));
  } else {
    rawList = String(value).split(/[،,\-]/);
  }

  return rawList.map((item) => normalizeText(item)).filter(Boolean);
}

const isGlobalAdminRole = (role?: any) => {
  const norm = normalizeText(role);
  return ['admin', 'superadmin', 'global_admin', 'globaladmin'].includes(norm);
};

const isProvinceAdminRole = (role?: any) => {
  const norm = normalizeText(role);
  return ['province_admin', 'provinceadmin', 'admin_province', 'ostan_admin'].includes(norm);
};

const isStudentRole = (role?: any) => {
  const norm = normalizeText(role);
  return ['student', 'user', 'learner'].includes(norm);
};

const isTeacherRole = (role?: any) => {
  const norm = normalizeText(role);
  return ['teacher', 'mentor', 'moallem'].includes(norm);
};

const getRecipientRoleLabel = (role?: any) => {
  if (isStudentRole(role)) return 'دانش‌آموز';
  if (isTeacherRole(role)) return 'معلم';
  if (isProvinceAdminRole(role)) return 'ادمین استان';
  if (isGlobalAdminRole(role)) return 'ادمین کل';
  return role || 'کاربر';
};

interface Message {
  id: string;
  senderRole: string;
  senderName: string;
  message: string;
  fileData?: string;
  fileName?: string;
  createdAt: string;
}

interface Ticket {
  id: string;
  userId: string;
  userName: string;
  userRole: string;
  subject: string;
  status: 'open' | 'closed';
  messages: Message[];
  createdAt: string;
  updatedAt: string;
  senderId?: string;
  senderName?: string;
  senderRole?: string;
  receiverId?: string;
  receiverName?: string;
  receiverRole?: string;
}

interface User {
  id: string | number;
  name: string;
  role?: string;
  province?: any;
  grade?: any;
  createdBy?: string | number;
  teacherId?: string | number;
}

export default function StudentTicketsPage() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [currentStudent, setCurrentStudent] = useState<User | null>(null);
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);

  const [isCreatingNew, setIsCreatingNew] = useState(false);
  const [newTicketUser, setNewTicketUser] = useState('');
  const [newTicketSubject, setNewTicketSubject] = useState('');
  const [newTicketMessage, setNewTicketMessage] = useState('');
  const [newTicketFile, setNewTicketFile] = useState<File | null>(null);

  const [replyMessage, setReplyMessage] = useState('');
  const [replyFile, setReplyFile] = useState<File | null>(null);

  const messageEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const loadData = () => {
      const storedTickets = localStorage.getItem('tickets');
      const storedUsers = localStorage.getItem('users');
      const storedCurrentUser =
        localStorage.getItem('currentUser') || localStorage.getItem('user');

      const parsedTickets: Ticket[] = storedTickets ? JSON.parse(storedTickets) : [];
      const parsedUsers: User[] = storedUsers ? JSON.parse(storedUsers) : [];
      const parsedCurrentUser: User | null = storedCurrentUser
        ? JSON.parse(storedCurrentUser)
        : null;

      setUsers(parsedUsers);
      setCurrentStudent(parsedCurrentUser);

      if (parsedCurrentUser?.id) {
        const studentId = String(parsedCurrentUser.id);

        const studentTickets = parsedTickets.filter((ticket) => {
          return (
            String(ticket.userId) === studentId ||
            String(ticket.senderId) === studentId ||
            String(ticket.receiverId) === studentId
          );
        });

        setTickets(studentTickets);

        if (!selectedTicketId && studentTickets.length > 0) {
          setSelectedTicketId(studentTickets[0].id);
        }

        if (
          selectedTicketId &&
          !studentTickets.some((ticket) => ticket.id === selectedTicketId)
        ) {
          setSelectedTicketId(studentTickets.length > 0 ? studentTickets[0].id : null);
        }
      } else {
        setTickets([]);
        setSelectedTicketId(null);
      }
    };

    loadData();
    window.addEventListener('storage', loadData);
    return () => window.removeEventListener('storage', loadData);
  }, [selectedTicketId]);

  useEffect(() => {
    messageEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [tickets, selectedTicketId]);

  const relatedTeachers = useMemo(() => {
    if (!currentStudent) return [];

    const studentId = String(currentStudent.id);
    const studentProvinces = parseAndNormalizeValues(currentStudent.province);
    const studentGrades = parseAndNormalizeValues(currentStudent.grade);

    return users.filter((user) => {
      if (!isTeacherRole(user.role)) return false;

      const teacherId = String(user.id);
      const teacherProvinces = parseAndNormalizeValues(user.province);
      const teacherGrades = parseAndNormalizeValues(user.grade);

      const directRelation =
        String(currentStudent.teacherId) === teacherId ||
        String(currentStudent.createdBy) === teacherId ||
        String(user.createdBy) === studentId;

      const provinceMatch =
        studentProvinces.some((province) => teacherProvinces.includes(province)) ||
        teacherProvinces.includes('all') ||
        teacherProvinces.includes('همه') ||
        teacherProvinces.includes('سراسری');

      const gradeMatch =
        studentGrades.some((grade) => teacherGrades.includes(grade)) ||
        teacherGrades.includes('all') ||
        teacherGrades.includes('همه');

      return directRelation || (provinceMatch && gradeMatch);
    });
  }, [users, currentStudent]);

  const allowedRecipients = useMemo(() => {
    const uniqueTeachers: User[] = [];

    relatedTeachers.forEach((teacher) => {
      if (!uniqueTeachers.some((item) => String(item.id) === String(teacher.id))) {
        uniqueTeachers.push(teacher);
      }
    });

    return uniqueTeachers;
  }, [relatedTeachers]);

  const activeTicket = tickets.find((ticket) => ticket.id === selectedTicketId);

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = (error) => reject(error);
    });
  };

  const syncStudentTickets = (allTickets: Ticket[], studentId: string) => {
    const studentTickets = allTickets.filter((ticket) => {
      return (
        String(ticket.userId) === studentId ||
        String(ticket.senderId) === studentId ||
        String(ticket.receiverId) === studentId
      );
    });

    setTickets(studentTickets);
    return studentTickets;
  };

  const getTicketPeerName = (ticket: Ticket) => {
    if (!currentStudent) return ticket.receiverName || ticket.senderName || 'نامشخص';

    const studentId = String(currentStudent.id);

    if (String(ticket.senderId) === studentId) {
      return ticket.receiverName || 'مخاطب';
    }

    return ticket.senderName || ticket.userName || 'مخاطب';
  };

  const getMessageClassName = (message: Message) => {
    return isStudentRole(message.senderRole)
      ? `${styles.messageWrapper} ${styles.messageUser}`
      : `${styles.messageWrapper} ${styles.messageAdmin}`;
  };

  const handleCreateTicket = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!currentStudent || !newTicketUser || !newTicketSubject.trim() || !newTicketMessage.trim()) {
      return;
    }

    const selectedUser = allowedRecipients.find((user) => String(user.id) === newTicketUser);
    if (!selectedUser) return;

    let base64File = '';
    if (newTicketFile) {
      base64File = await fileToBase64(newTicketFile);
    }

    const now = new Date().toLocaleString('fa-IR');

    const newTicket: Ticket = {
      id: `TCK-${Date.now()}`,
      userId: String(currentStudent.id),
      userName: currentStudent.name,
      userRole: currentStudent.role || 'student',
      senderId: String(currentStudent.id),
      senderName: currentStudent.name,
      senderRole: currentStudent.role || 'student',
      receiverId: String(selectedUser.id),
      receiverName: selectedUser.name,
      receiverRole: selectedUser.role || 'teacher',
      subject: newTicketSubject.trim(),
      status: 'open',
      createdAt: now,
      updatedAt: now,
      messages: [
        {
          id: `MSG-${Date.now()}`,
          senderRole: currentStudent.role || 'student',
          senderName: currentStudent.name,
          message: newTicketMessage.trim(),
          fileData: base64File || undefined,
          fileName: newTicketFile ? newTicketFile.name : undefined,
          createdAt: now,
        },
      ],
    };

    const allTickets: Ticket[] = JSON.parse(localStorage.getItem('tickets') || '[]');
    const updatedTickets = [newTicket, ...allTickets];

    localStorage.setItem('tickets', JSON.stringify(updatedTickets));
    setTickets((prev) => [newTicket, ...prev]);
    setSelectedTicketId(newTicket.id);

    setIsCreatingNew(false);
    setNewTicketUser('');
    setNewTicketSubject('');
    setNewTicketMessage('');
    setNewTicketFile(null);

    window.dispatchEvent(new Event('storage'));
  };

  const handleSendReply = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!currentStudent || !selectedTicketId || (!replyMessage.trim() && !replyFile)) {
      return;
    }

    if (activeTicket?.status === 'closed') return;

    let base64File = '';
    if (replyFile) {
      base64File = await fileToBase64(replyFile);
    }

    const now = new Date().toLocaleString('fa-IR');

    const newMessage: Message = {
      id: `MSG-${Date.now()}`,
      senderRole: currentStudent.role || 'student',
      senderName: currentStudent.name,
      message: replyMessage.trim(),
      fileData: base64File || undefined,
      fileName: replyFile ? replyFile.name : undefined,
      createdAt: now,
    };

    const allTickets: Ticket[] = JSON.parse(localStorage.getItem('tickets') || '[]');
    const updatedTickets = allTickets.map((ticket) => {
      if (ticket.id !== selectedTicketId) return ticket;

      return {
        ...ticket,
        status: 'open' as const,
        updatedAt: now,
        messages: [...ticket.messages, newMessage],
      };
    });

    localStorage.setItem('tickets', JSON.stringify(updatedTickets));

    syncStudentTickets(updatedTickets, String(currentStudent.id));
    setReplyMessage('');
    setReplyFile(null);

    window.dispatchEvent(new Event('storage'));
  };

  return (
    <div className={styles.container}>
      {isCreatingNew ? (
        <form onSubmit={handleCreateTicket} className={styles.formCard}>
          <div className={styles.pageHeader}>
            <div className={styles.titleArea}>
              <h1>ایجاد تیکت جدید</h1>
              <p>پیام خود را فقط برای معلم مرتبط با استان و پایه خود ارسال کنید.</p>
            </div>
          </div>

          <div className={styles.formGroup}>
            <label>انتخاب مخاطب</label>
            <select
              className={styles.formSelect}
              value={newTicketUser}
              onChange={(e) => setNewTicketUser(e.target.value)}
              required
            >
              <option value="">انتخاب کنید...</option>
              {allowedRecipients.map((user) => (
                <option key={String(user.id)} value={String(user.id)}>
                  {user.name} ({getRecipientRoleLabel(user.role)})
                </option>
              ))}
            </select>
          </div>

          <div className={styles.formGroup}>
            <label>موضوع</label>
            <input
              type="text"
              className={styles.formInput}
              value={newTicketSubject}
              onChange={(e) => setNewTicketSubject(e.target.value)}
              placeholder="مثلاً مشکل ورود به آزمون"
              required
            />
          </div>

          <div className={styles.formGroup}>
            <label>متن پیام</label>
            <textarea
              className={styles.formTextarea}
              value={newTicketMessage}
              onChange={(e) => setNewTicketMessage(e.target.value)}
              placeholder="پیام خود را کامل بنویسید..."
              required
            />
          </div>

          <div className={styles.formGroup}>
            <label>فایل پیوست</label>
            <input
              type="file"
              className={styles.formInput}
              onChange={(e) => setNewTicketFile(e.target.files?.[0] || null)}
            />
          </div>

          <div className={styles.actions}>
            <button type="submit" className={styles.primaryButton}>
              ثبت تیکت
            </button>
            <button
              type="button"
              className={styles.secondaryButton}
              onClick={() => {
                setIsCreatingNew(false);
                setNewTicketUser('');
                setNewTicketSubject('');
                setNewTicketMessage('');
                setNewTicketFile(null);
              }}
            >
              انصراف
            </button>
          </div>
        </form>
      ) : (
        <>
          <div className={styles.pageHeader}>
            <div className={styles.titleArea}>
              <h1>سیستم تیکت دانش‌آموز</h1>
              <p>مدیریت مکاتبات با معلم مرتبط</p>
            </div>

            <button
              type="button"
              className={styles.newTicketBtn}
              onClick={() => setIsCreatingNew(true)}
            >
              تیکت جدید
            </button>
          </div>

          <div className={styles.layout}>
            <aside className={styles.sidebarCard}>
              <div className={styles.header}>
                <h2 className={styles.sidebarTitle}>گفتگوها</h2>
                <span className={styles.countBadge}>{tickets.length} تیکت</span>
              </div>

              {tickets.length > 0 ? (
                <div className={styles.ticketList}>
                  {tickets.map((ticket) => (
                    <button
                      key={ticket.id}
                      type="button"
                      className={`${styles.ticketItem} ${
                        selectedTicketId === ticket.id ? styles.activeTicket : ''
                      }`}
                      onClick={() => setSelectedTicketId(ticket.id)}
                    >
                      <div className={styles.ticketHeader}>
                        <div className={styles.subjectText}>{ticket.subject}</div>
                        <span
                          className={`${styles.statusBadge} ${
                            ticket.status === 'open' ? styles.statusOpen : styles.statusClosed
                          }`}
                        >
                          {ticket.status === 'open' ? 'باز' : 'بسته'}
                        </span>
                      </div>

                      <div className={styles.ticketSub}>
                        <span>{getTicketPeerName(ticket)}</span>
                        <small>{ticket.updatedAt}</small>
                      </div>
                    </button>
                  ))}
                </div>
              ) : (
                <p className={styles.emptyText}>هنوز تیکتی ثبت نشده است.</p>
              )}
            </aside>

            <section className={styles.chatArea}>
              {activeTicket ? (
                <>
                  <div className={styles.chatHeader}>
                    <div className={styles.chatTitleInfo}>
                      <h3>{activeTicket.subject}</h3>
                      <p>
                        گفتگو با {getTicketPeerName(activeTicket)} - آخرین بروزرسانی:{' '}
                        {activeTicket.updatedAt}
                      </p>
                    </div>

                    <span
                      className={`${styles.statusBadge} ${
                        activeTicket.status === 'open'
                          ? styles.statusOpen
                          : styles.statusClosed
                      }`}
                    >
                      {activeTicket.status === 'open' ? 'باز' : 'بسته'}
                    </span>
                  </div>

                  <div className={styles.messageHistory}>
                    {activeTicket.messages.map((message) => (
                      <div key={message.id} className={getMessageClassName(message)}>
                        <div className={styles.messageBubble}>
                          <strong>{message.senderName}</strong>
                          <p>{message.message}</p>

                          {message.fileData ? (
                            <div className={styles.attachmentArea}>
                              <a
                                href={message.fileData}
                                download={message.fileName || 'attachment'}
                                className={styles.downloadLink}
                              >
                                📎 {message.fileName || 'دانلود فایل'}
                              </a>
                            </div>
                          ) : null}
                        </div>

                        <div className={styles.messageMeta}>
                          <span>{message.createdAt}</span>
                        </div>
                      </div>
                    ))}

                    <div ref={messageEndRef} />
                  </div>

                  <form onSubmit={handleSendReply} className={styles.inputForm}>
                    <div className={styles.inputRow}>
                      <textarea
                        className={styles.textInput}
                        value={replyMessage}
                        onChange={(e) => setReplyMessage(e.target.value)}
                        placeholder="پاسخ خود را بنویسید..."
                        rows={3}
                        disabled={activeTicket.status === 'closed'}
                      />

                      <button
                        type="submit"
                        className={styles.sendBtn}
                        disabled={
                          activeTicket.status === 'closed' ||
                          (!replyMessage.trim() && !replyFile)
                        }
                      >
                        ارسال
                      </button>
                    </div>

                    <div className={styles.fileUploadRow}>
                      <div className={styles.fileInputWrapper}>
                        <input
                          type="file"
                          onChange={(e) => setReplyFile(e.target.files?.[0] || null)}
                          disabled={activeTicket.status === 'closed'}
                        />
                        <div className={styles.fileInputLabel}>انتخاب فایل</div>
                      </div>

                      {replyFile ? (
                        <span className={styles.selectedFileName}>{replyFile.name}</span>
                      ) : (
                        <span>فایلی انتخاب نشده است</span>
                      )}
                    </div>
                  </form>
                </>
              ) : (
                <div className={styles.noTicketSelected}>
                  <h3>تیکتی انتخاب نشده است</h3>
                  <p>از لیست سمت راست ی گفتگو را انتخاب کنید یا تیکت جدید بسازید.</p>
                </div>
              )}
            </section>
          </div>
        </>
      )}
    </div>
  );
}
