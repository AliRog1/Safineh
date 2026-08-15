'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
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
  return rawList.map((item) => item.trim()).filter((item) => item.length > 0);
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

const getRecipientRoleLabel = (role?: any) => {
  const norm = normalizeText(role);
  if (isStudentRole(norm)) return 'دانش‌آموز';
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

export default function TeacherTicketsPage() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [currentTeacher, setCurrentTeacher] = useState<User | null>(null);
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
      setCurrentTeacher(parsedCurrentUser);

      if (parsedCurrentUser?.id) {
        const teacherId = String(parsedCurrentUser.id);
        const teacherTickets = parsedTickets.filter((ticket) => {
          return (
            String(ticket.senderId) === teacherId ||
            String(ticket.userId) === teacherId ||
            String(ticket.receiverId) === teacherId
          );
        });

        setTickets(teacherTickets);

        if (!selectedTicketId && teacherTickets.length > 0) {
          setSelectedTicketId(teacherTickets[0].id);
        }

        if (
          selectedTicketId &&
          !teacherTickets.some((ticket) => ticket.id === selectedTicketId)
        ) {
          setSelectedTicketId(teacherTickets.length > 0 ? teacherTickets[0].id : null);
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
  }, [selectedTicketId, tickets]);

  const allowedRecipients = useMemo(() => {
    if (!currentTeacher) return [];

    const teacherId = String(currentTeacher.id);
    const teacherProvinces = parseAndNormalizeValues(currentTeacher.province).map(normalizeText);
    const teacherGrades = parseAndNormalizeValues(currentTeacher.grade).map(normalizeText);

    return users.filter((user) => {
      const userId = String(user.id);
      if (!userId || userId === teacherId) return false;

      const userRole = normalizeText(user.role);
      const userProvinces = parseAndNormalizeValues(user.province).map(normalizeText);
      const userGrades = parseAndNormalizeValues(user.grade).map(normalizeText);

      // فقط ادمین کل مجاز است؛ ادمین استان از لیست حذف می‌شود
      if (isGlobalAdminRole(user.role)) return true;
      if (isProvinceAdminRole(user.role)) return false;

      if (isStudentRole(userRole)) {
        if (String(user.createdBy) === teacherId || String(user.teacherId) === teacherId) {
          return true;
        }

        const hasProvinceMatch =
          teacherProvinces.includes('سراسری') ||
          teacherProvinces.includes('all') ||
          userProvinces.some((province) => teacherProvinces.includes(province));

        const hasGradeMatch =
          teacherGrades.includes('همه') ||
          teacherGrades.includes('all') ||
          userGrades.some((grade) => teacherGrades.includes(grade));

        return hasProvinceMatch && hasGradeMatch;
      }

      return false;
    });
  }, [users, currentTeacher]);

  const globalAdmins = useMemo(() => {
    return users.filter((user) => isGlobalAdminRole(user.role));
  }, [users]);

  const activeTicket = tickets.find((ticket) => ticket.id === selectedTicketId);

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = (error) => reject(error);
    });
  };

  const syncTeacherTickets = (allTickets: Ticket[], teacherId: string) => {
    const teacherTickets = allTickets.filter((ticket) => {
      return (
        String(ticket.senderId) === teacherId ||
        String(ticket.receiverId) === teacherId ||
        String(ticket.userId) === teacherId
      );
    });

    setTickets(teacherTickets);
    return teacherTickets;
  };

  const getPeerRole = (ticket: Ticket) => {
    if (!currentTeacher) return ticket.receiverRole || ticket.senderRole || ticket.userRole;
    const teacherId = String(currentTeacher.id);

    if (String(ticket.senderId) === teacherId) {
      return ticket.receiverRole || ticket.userRole;
    }

    return ticket.senderRole || ticket.userRole;
  };

  const isStudentTicket = (ticket?: Ticket | null) => {
    if (!ticket) return false;
    return isStudentRole(getPeerRole(ticket));
  };

  const canReferToAdmin = (ticket?: Ticket | null) => {
    if (!ticket) return false;
    if (!isStudentTicket(ticket)) return false;
    return globalAdmins.length > 0;
  };

  const handleCreateTicket = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!currentTeacher || !newTicketUser || !newTicketSubject.trim() || !newTicketMessage.trim()) {
      return;
    }

    const selectedUser = users.find((user) => String(user.id) === newTicketUser);
    if (!selectedUser) return;

    let base64File = '';
    if (newTicketFile) {
      base64File = await fileToBase64(newTicketFile);
    }

    const now = new Date().toLocaleString('fa-IR');

    const newTicket: Ticket = {
      id: `TCK-${Date.now()}`,
      userId: String(currentTeacher.id),
      userName: currentTeacher.name,
      userRole: 'teacher',
      senderId: String(currentTeacher.id),
      senderName: currentTeacher.name,
      senderRole: 'teacher',
      receiverId: String(selectedUser.id),
      receiverName: selectedUser.name,
      receiverRole: selectedUser.role || 'user',
      subject: newTicketSubject.trim(),
      status: 'open',
      createdAt: now,
      updatedAt: now,
      messages: [
        {
          id: `MSG-${Date.now()}`,
          senderRole: 'teacher',
          senderName: currentTeacher.name,
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

    if (!currentTeacher || !selectedTicketId || (!replyMessage.trim() && !replyFile)) {
      return;
    }

    let base64File = '';
    if (replyFile) {
      base64File = await fileToBase64(replyFile);
    }

    const now = new Date().toLocaleString('fa-IR');

    const newMessage: Message = {
      id: `MSG-${Date.now()}`,
      senderRole: 'teacher',
      senderName: currentTeacher.name,
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

    if (currentTeacher?.id) {
      syncTeacherTickets(updatedTickets, String(currentTeacher.id));
    }

    setReplyMessage('');
    setReplyFile(null);

    window.dispatchEvent(new Event('storage'));
  };

  const handleToggleTicketStatus = () => {
    if (!currentTeacher || !activeTicket || !isStudentTicket(activeTicket)) return;

    const nextStatus: Ticket['status'] = activeTicket.status === 'open' ? 'closed' : 'open';
    const now = new Date().toLocaleString('fa-IR');

    const allTickets: Ticket[] = JSON.parse(localStorage.getItem('tickets') || '[]');
    const updatedTickets = allTickets.map((ticket) => {
      if (ticket.id !== activeTicket.id) return ticket;

      return {
        ...ticket,
        status: nextStatus,
        updatedAt: now,
      };
    });

    localStorage.setItem('tickets', JSON.stringify(updatedTickets));
    syncTeacherTickets(updatedTickets, String(currentTeacher.id));
    window.dispatchEvent(new Event('storage'));
  };

  const handleReferToAdmin = () => {
    if (!currentTeacher || !activeTicket || !canReferToAdmin(activeTicket)) return;

    const targetAdmin =
      globalAdmins.find((admin) => String(admin.id) !== String(currentTeacher.id)) ||
      globalAdmins[0];

    if (!targetAdmin) return;

    const now = new Date().toLocaleString('fa-IR');

    const referralMessage: Message = {
      id: `MSG-${Date.now()}`,
      senderRole: 'teacher',
      senderName: currentTeacher.name,
      message: `این تیکت به ادمین کل (${targetAdmin.name}) ارجاع داده شد.`,
      createdAt: now,
    };

    const allTickets: Ticket[] = JSON.parse(localStorage.getItem('tickets') || '[]');
    const updatedTickets = allTickets.map((ticket) => {
      if (ticket.id !== activeTicket.id) return ticket;

      return {
        ...ticket,
        receiverId: String(targetAdmin.id),
        receiverName: targetAdmin.name,
        receiverRole: targetAdmin.role || 'admin',
        status: 'open' as const,
        updatedAt: now,
        messages: [...ticket.messages, referralMessage],
      };
    });

    localStorage.setItem('tickets', JSON.stringify(updatedTickets));
    syncTeacherTickets(updatedTickets, String(currentTeacher.id));
    window.dispatchEvent(new Event('storage'));
  };

  const getTicketPeerName = (ticket: Ticket) => {
    if (!currentTeacher) return ticket.receiverName || ticket.senderName || 'نامشخص';
    const teacherId = String(currentTeacher.id);

    if (String(ticket.senderId) === teacherId) {
      return ticket.receiverName || 'مخاطب';
    }

    return ticket.senderName || ticket.userName || 'مخاطب';
  };

  const getMessageClassName = (message: Message) => {
    return normalizeText(message.senderRole) === 'teacher'
      ? `${styles.messageWrapper} ${styles.messageUser}`
      : `${styles.messageWrapper} ${styles.messageAdmin}`;
  };

  return (
    <div className={styles.container}>
      {isCreatingNew ? (
        <form onSubmit={handleCreateTicket} className={styles.formCard}>
          <div className={styles.pageHeader}>
            <div className={styles.titleArea}>
              <h1>ایجاد تیکت جدید</h1>
              <p>پیام خود را برای ادمین کل یا دانش‌آموز مجاز ارسال کنید.</p>
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
              placeholder="مثلاً مشکل دسترسی به آزمون"
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
              <h1>سیستم تیکت معلم</h1>
              <p>مدیریت مکاتبات با ادمین کل و دانش‌آموزان مجاز</p>
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

                    <div
                      style={{
                        display: 'flex',
                        gap: '8px',
                        alignItems: 'center',
                        flexWrap: 'wrap',
                      }}
                    >
                      {isStudentTicket(activeTicket) && (
                        <button
                          type="button"
                          className={styles.secondaryButton}
                          onClick={handleToggleTicketStatus}
                        >
                          {activeTicket.status === 'open' ? 'بستن تیکت' : 'باز کردن تیکت'}
                        </button>
                      )}

                      {canReferToAdmin(activeTicket) && (
                        <button
                          type="button"
                          className={styles.primaryButton}
                          onClick={handleReferToAdmin}
                        >
                          ارجاع به ادمین کل
                        </button>
                      )}

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
                  <p>از لیست سمت راست یک گفتگو را انتخاب کنید یا تیکت جدید بسازید.</p>
                </div>
              )}
            </section>
          </div>
        </>
      )}
    </div>
  );
}
