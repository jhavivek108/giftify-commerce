import { Badge, ErrorMessage, LoadingSpinner } from '../../components/ui';
import useAsync from '../../hooks/useAsync';
import { adminApi } from '../../services/api';
import { useToast } from '../../context/ToastContext';
import { formatDateTime } from '../../utils/format';
import { PageHeader } from './shared';

export default function Messages() {
  const { error: toastError } = useToast();
  const { data, loading, error, reload } = useAsync(() => adminApi.messages({ limit: 100 }), []);
  const messages = data?.items || [];

  const markRead = async (id) => {
    try {
      await adminApi.markMessageRead(id);
      reload();
    } catch (e) {
      toastError(e.message);
    }
  };

  return (
    <>
      <PageHeader title="Messages">Messages and business enquiries sent through the contact page.</PageHeader>
      {loading ? (
        <LoadingSpinner />
      ) : error ? (
        <ErrorMessage error={error} onRetry={reload} />
      ) : messages.length === 0 ? (
        <p className="surface px-6 py-10 text-center text-muted">No messages yet.</p>
      ) : (
        <ul className="space-y-4">
          {messages.map((m) => (
            <li key={m._id} className={`surface p-6 ${m.isRead ? 'opacity-75' : ''}`}>
              <div className="flex flex-wrap items-center gap-3">
                <p className="mr-auto font-display text-xl font-bold">{m.subject || (m.type === 'business' ? 'Business enquiry' : 'Message')}</p>
                {m.type === 'business' ? (
                  <Badge bg="#EFE9FA" ink="#37246B">
                    Business
                  </Badge>
                ) : (
                  <Badge bg="#E6F2FA" ink="#0E2F6B">
                    General
                  </Badge>
                )}
                {!m.isRead && (
                  <Badge bg="#FDF3D2" ink="#5A3C00">
                    New
                  </Badge>
                )}
              </div>
              <p className="mt-1 text-sm text-muted">
                {m.name}
                {m.company ? ` · ${m.company}` : ''} ·{' '}
                <a href={`mailto:${m.email}`} className="underline">
                  {m.email}
                </a>
                {m.phone ? ` · ${m.phone}` : ''} · {formatDateTime(m.createdAt)}
              </p>
              <p className="mt-3 whitespace-pre-wrap leading-relaxed">{m.message}</p>
              {!m.isRead && (
                <button className="btn btn-outline btn-sm mt-4" onClick={() => markRead(m._id)}>
                  Mark as read
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
