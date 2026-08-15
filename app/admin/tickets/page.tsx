'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import styles from './tickets.module.css';

// ساختار داده‌ای پیام‌های داخل یک تیکت
interface Message {
  id: string;
  senderRole: 'admin' | 'user';
  senderName: string;
  message: string;
  fileData?: string; // فایل به صورت Base64
  fileName?: string;
  createdAt: string;
}

// ساختار داده‌ای اصلی تیکت
interface Ticket {
  id: string;
  userId: string;       // شناسه کاربر (دانش‌آموز یا استاد)
  userName: string;     // نام کاربر
  userRole: string;     // نقش کاربر
  subject: string;
  status: 'open' | 'closed';
  messages: Message[];
  createdAt: string;
  updatedAt: string;
}

interface User {
  id: string;
  name: string;
  role: string;
}

export default function AdminTicketsManagement() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);

  // حالت‌های مربوط به فرم تیکت جدید
  const [isCreatingNew, setIsCreatingNew] = useState(false);
  const [newTicketUser, setNewTicketUser] = useState('');
  const [newTicketSubject, setNewTicketSubject] = useState('');
  const [newTicketMessage, setNewTicketMessage] = useState('');
  const [newTicketFile, setNewTicketFile] = useState<File | null>(null);

  // حالت‌های مربوط به پاسخ به تیکت موجود
  const [replyMessage, setReplyMessage] = useState('');
  const [replyFile, setReplyFile] = useState<File | null>(null);

  const messageEndRef = useRef<HTMLDivElement>(null);

  // بارگذاری داده‌ها از LocalStorage
  useEffect(() => {
    const loadData = () => {
      const storedTickets = localStorage.getItem('tickets');
      if (storedTickets) {
        setTickets(JSON.parse(storedTickets));
      } else {
        setTickets([]);
        localStorage.setItem('tickets', JSON.stringify([]));
      }

      const storedUsers = localStorage.getItem('users');
      if (storedUsers) {
        setUsers(JSON.parse(storedUsers));
      }
    };

    loadData();
    window.addEventListener('storage', loadData);
    return () => {
      window.removeEventListener('storage', loadData);
    };
  }, []);

  // اسکرول خودکار به انتهای چت هنگام دریافت پیام جدید
  useEffect(() => {
    messageEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [selectedTicketId, tickets]);

  const activeTicket = tickets.find(t => t.id === selectedTicketId);

  // کمکی برای تبدیل فایل به Base64
  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = error => reject(error);
    });
  };

  // ایجاد تیکت جدید توسط ادمین برای کاربر
  const handleCreateTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTicketUser || !newTicketSubject || !newTicketMessage) {
      alert('لطفاً تمامی فیلدهای الزامی را پر کنید.');
      return;
    }

    const selectedUser = users.find(u => u.id === newTicketUser);
    if (!selectedUser) return;

    let base64File = '';
    if (newTicketFile) {
      base64File = await fileToBase64(newTicketFile);
    }

    const newTicket: Ticket = {
      id: 'TCK-' + Date.now(),
      userId: selectedUser.id,
      userName: selectedUser.name,
      userRole: selectedUser.role,
      subject: newTicketSubject,
      status: 'open',
      createdAt: new Date().toLocaleString('fa-IR'),
      updatedAt: new Date().toLocaleString('fa-IR'),
      messages: [
        {
          id: 'MSG-' + Date.now(),
          senderRole: 'admin',
          senderName: 'مدیریت سیستم',
          message: newTicketMessage,
          fileData: base64File || undefined,
          fileName: newTicketFile ? newTicketFile.name : undefined,
          createdAt: new Date().toLocaleString('fa-IR')
        }
      ]
    };

    const updatedTickets = [newTicket, ...tickets];
    localStorage.setItem('tickets', JSON.stringify(updatedTickets));
    setTickets(updatedTickets);
    setSelectedTicketId(newTicket.id);

    // ریست فرم
    setIsCreatingNew(false);
    setNewTicketUser('');
    setNewTicketSubject('');
    setNewTicketMessage('');
    setNewTicketFile(null);
    window.dispatchEvent(new Event('storage'));
  };

  // ارسال پاسخ در یک تیکت باز
  const handleSendReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTicketId || (!replyMessage.trim() && !replyFile)) return;

    let base64File = '';
    if (replyFile) {
      base64File = await fileToBase64(replyFile);
    }

    const newMessage: Message = {
      id: 'MSG-' + Date.now(),
      senderRole: 'admin',
      senderName: 'مدیریت سیستم',
      message: replyMessage,
      fileData: base64File || undefined,
      fileName: replyFile ? replyFile.name : undefined,
      createdAt: new Date().toLocaleString('fa-IR')
    };

    const updatedTickets = tickets.map(t => {
      if (t.id === selectedTicketId) {
        return {
          ...t,
          status: 'open' as const, // در صورت ارسال پاسخ، تیکت فعال می‌ماند
          updatedAt: new Date().toLocaleString('fa-IR'),
          messages: [...t.messages, newMessage]
        };
      }
      return t;
    });

    localStorage.setItem('tickets', JSON.stringify(updatedTickets));
    setTickets(updatedTickets);
    setReplyMessage('');
    setReplyFile(null);
    window.dispatchEvent(new Event('storage'));
  };

  // تغییر وضعیت تیکت (بستن تیکت)
  const handleCloseTicket = (ticketId: string) => {
    const updatedTickets = tickets.map(t => {
      if (t.id === ticketId) {
        return { ...t, status: 'closed' as const };
      }
      return t;
    });
    localStorage.setItem('tickets', JSON.stringify(updatedTickets));
    setTickets(updatedTickets);
    window.dispatchEvent(new Event('storage'));
  };

  return (
    <div className={styles.container}>
      <div className={styles.pageHeader}>
        <div className={styles.titleArea}>
          <h1>پشتیبانی و تیکت‌ها</h1>
          <p>ارتباط مستقیم با کاربران، معلمان و دانش‌آموزان با قابلیت تبادل فایل</p>
        </div>
        {!isCreatingNew ? (
          <button className={styles.newTicketBtn} onClick={() => setIsCreatingNew(true)}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            ارسال تیکت جدید
          </button>
        ) : (
          <button className={styles.closeTicketBtn} onClick={() => setIsCreatingNew(false)}>
            بازگشت به لیست گفتگوها
          </button>
        )}
      </div>

      {isCreatingNew ? (
        /* فرم ایجاد تیکت جدید */
        <form onSubmit={handleCreateTicket} className={styles.formCard}>
          <div className={styles.formGroup}>
            <label>انتخاب مخاطب (کاربر):</label>
            <select
              className={styles.formSelect}
              value={newTicketUser}
              onChange={(e) => setNewTicketUser(e.target.value)}
              required
            >
              <option value="">انتخاب کنید...</option>
              {users.map(u => (
                <option key={u.id} value={u.id}>
                  {u.name} ({u.role === 'student' ? 'دانش‌آموز' : u.role === 'teacher' ? 'استاد' : 'مدیر'})
                </option>
              ))}
            </select>
          </div>

          <div className={styles.formGroup}>
            <label>موضوع تیکت:</label>
            <input
              type="text"
              className={styles.formInput}
              placeholder="مثال: رفع اشکال در کلاس فیزیک، تایید حساب کاربری"
              value={newTicketSubject}
              onChange={(e) => setNewTicketSubject(e.target.value)}
              required
            />
          </div>

          <div className={styles.formGroup}>
            <label>متن پیام:</label>
            <textarea
              className={styles.formTextarea}
              placeholder="متن خود را اینجا بنویسید..."
              value={newTicketMessage}
              onChange={(e) => setNewTicketMessage(e.target.value)}
              required
            />
          </div>

          <div className={styles.formGroup}>
            <label>ضمیمه کردن فایل (اختیاری):</label>
            <div className={styles.fileInputWrapper}>
              <div className={styles.fileInputLabel}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" />
                </svg>
                {newTicketFile ? 'تغییر فایل' : 'انتخاب فایل'}
              </div>
              <input
                type="file"
                onChange={(e) => {
                  if (e.target.files?.[0]) setNewTicketFile(e.target.files[0]);
                }}
              />
            </div>
            {newTicketFile && (
              <span className={styles.selectedFileName}>فایل انتخاب شده: {newTicketFile.name}</span>
            )}
          </div>

          <button type="submit" className={styles.sendBtn} style={{ marginTop: '10px', alignSelf: 'flex-start' }}>
            ایجاد و ارسال تیکت
          </button>
        </form>
      ) : (
        /* چیدمان دو ستونه گفتگوها */
        <div className={styles.layout}>
          {/* ستون راست: لیست تیکت‌ها */}
          <div className={styles.sidebarCard}>
            <div className={styles.sidebarTitle}>گفتگوهای پشتیبانی</div>
            <div className={styles.ticketList}>
              {tickets.length > 0 ? (
                tickets.map(t => (
                  <div
                    key={t.id}
                    className={`${styles.ticketItem} ${selectedTicketId === t.id ? styles.activeTicket : ''}`}
                    onClick={() => setSelectedTicketId(t.id)}
                  >
                    <div className={styles.ticketHeader}>
                      <span className={styles.subjectText}>{t.subject}</span>
                      <span className={`${styles.statusBadge} ${t.status === 'open' ? styles.statusOpen : styles.statusClosed}`}>
                        {t.status === 'open' ? 'باز' : 'بسته'}
                      </span>
                    </div>
                    <div className={styles.ticketSub}>
                      <span>کاربر: {t.userName}</span>
                      <span>{t.updatedAt.split(' ')[0]}</span>
                    </div>
                  </div>
                ))
              ) : (
                <div style={{ color: '#64748b', fontSize: '13px', textAlign: 'center', marginTop: '20px' }}>
                  هیچ تیکتی ثبت نشده است.
                </div>
              )}
            </div>
          </div>

          {/* ستون چپ: جزییات تیکت انتخاب شده و چت */}
          <div className={styles.chatArea}>
            {activeTicket ? (
              <>
                <div className={styles.chatHeader}>
                  <div className={styles.chatTitleInfo}>
                    <h3>{activeTicket.subject}</h3>
                    <p>گفتگو با {activeTicket.userName} ({activeTicket.userRole === 'student' ? 'دانش‌آموز' : 'استاد'})</p>
                  </div>
                  {activeTicket.status === 'open' && (
                    <button
                      className={styles.closeTicketBtn}
                      onClick={() => handleCloseTicket(activeTicket.id)}
                    >
                      بستن تیکت
                    </button>
                  )}
                </div>

                {/* تاریخچه پیام‌ها */}
                <div className={styles.messageHistory}>
                  {activeTicket.messages.map(m => (
                    <div
                      key={m.id}
                      className={`${styles.messageWrapper} ${m.senderRole === 'admin' ? styles.messageAdmin : styles.messageUser}`}
                    >
                      <div className={styles.messageBubble}>
                        <p>{m.message}</p>
                        {m.fileData && (
                          <div className={styles.attachmentArea}>
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#38bdf8" strokeWidth="2.5">
                              <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" />
                            </svg>
                            <a href={m.fileData} download={m.fileName} className={styles.downloadLink}>
                              {m.fileName}
                            </a>
                          </div>
                        )}
                      </div>
                      <div className={styles.messageMeta}>
                        <span>{m.senderName}</span> • <span>{m.createdAt}</span>
                      </div>
                    </div>
                  ))}
                  <div ref={messageEndRef} />
                </div>

                {/* فرم پاسخ‌دهی */}
                <form onSubmit={handleSendReply} className={styles.inputForm}>
                  <div className={styles.inputRow}>
                    <textarea
                      value={replyMessage}
                      onChange={(e) => setReplyMessage(e.target.value)}
                      placeholder={activeTicket.status === 'closed' ? "این تیکت بسته شده است." : "پاسخ خود را بنویسید..."}
                      className={styles.textInput}
                      disabled={activeTicket.status === 'closed'}
                    />
                    <button
                      type="submit"
                      className={styles.sendBtn}
                      disabled={activeTicket.status === 'closed' || (!replyMessage.trim() && !replyFile)}
                    >
                      ارسال پاسخ
                    </button>
                  </div>
                  <div className={styles.fileUploadRow}>
                    {activeTicket.status === 'open' && (
                      <div className={styles.fileInputWrapper}>
                        <div className={styles.fileInputLabel}>
                          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" />
                          </svg>
                          ضمیمه کردن فایل
                        </div>
                        <input
                          type="file"
                          onChange={(e) => {
                            if (e.target.files?.[0]) setReplyFile(e.target.files[0]);
                          }}
                        />
                      </div>
                    )}
                    {replyFile && (
                      <span className={styles.selectedFileName}>آماده ارسال: {replyFile.name}</span>
                    )}
                  </div>
                </form>
              </>
            ) : (
              <div className={styles.noTicketSelected}>
                <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" color="#475569">
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                </svg>
                <p>جهت مشاهده گفتگو یا ارسال پاسخ، یک تیکت از لیست انتخاب کنید.</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
