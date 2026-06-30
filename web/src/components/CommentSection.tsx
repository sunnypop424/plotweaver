import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";

type Comment = {
  id: string;
  author_id: string;
  body: string;
  is_secret: boolean;
  created_at: string;
  profiles: { nickname: string | null } | null;
};

export function CommentSection({ novelId, authorId }: { novelId: string; authorId: string }) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [body, setBody] = useState("");
  const [isSecret, setIsSecret] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setCurrentUserId(data.user?.id ?? null));
  }, []);

  const fetchComments = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("comments")
      .select("id, author_id, body, is_secret, created_at, profiles(nickname)")
      .eq("novel_id", novelId)
      .order("created_at", { ascending: true });
    setComments((data as unknown as Comment[]) ?? []);
    setLoading(false);
  }, [novelId]);

  useEffect(() => { fetchComments(); }, [fetchComments]);

  const submit = async () => {
    if (!body.trim() || submitting || !currentUserId) return;
    setSubmitting(true);
    await supabase.from("comments").insert({
      novel_id: novelId,
      author_id: currentUserId,
      body: body.trim(),
      is_secret: isSecret,
    });
    setBody(""); setIsSecret(false);
    await fetchComments();
    setSubmitting(false);
  };

  const deleteComment = async (id: string) => {
    if (!confirm("댓글을 삭제할까요?")) return;
    await supabase.from("comments").delete().eq("id", id);
    setComments((cs) => cs.filter((c) => c.id !== id));
  };

  const isAuthor = (c: Comment) => c.author_id === currentUserId;
  const isNovelAuthor = currentUserId === authorId;
  const canDelete = (c: Comment) => isAuthor(c) || isNovelAuthor;
  const canRead = (c: Comment) => !c.is_secret || isAuthor(c) || isNovelAuthor;

  const visibleComments = comments.filter(canRead);

  return (
    <div className="mt-8">
      <div className="mb-4 flex items-center gap-2">
        <span className="text-base font-bold text-ink">댓글</span>
        <span className="text-sm font-bold text-muted">{visibleComments.length}</span>
      </div>

      {loading ? (
        <div className="py-6 text-center text-sm text-muted">불러오는 중...</div>
      ) : visibleComments.length === 0 ? (
        <div className="py-8 text-center text-sm text-muted">첫 번째 댓글을 남겨보세요!</div>
      ) : (
        <div className="flex flex-col gap-3 mb-5">
          {visibleComments.map((c) => (
            <CommentItem
              key={c.id}
              comment={c}
              isMine={isAuthor(c)}
              canDelete={canDelete(c)}
              onDelete={() => deleteComment(c.id)}
            />
          ))}
        </div>
      )}

      {currentUserId ? (
        <div className="rounded-xl border border-hairline bg-white p-4">
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="댓글을 입력하세요..."
            className="box-border w-full resize-none rounded-lg border border-hairline bg-canvas px-3.5 py-3 text-[15px] leading-[1.7] text-ink outline-none focus:border-brand focus:shadow-focus"
            rows={3}
          />
          <div className="mt-2.5 flex items-center justify-between gap-3">
            <label className="flex cursor-pointer items-center gap-2">
              <input
                type="checkbox"
                checked={isSecret}
                onChange={(e) => setIsSecret(e.target.checked)}
                className="h-4 w-4 accent-brand"
              />
              <span className="flex items-center gap-1 text-[13px] font-bold text-ink2">
                <span>🔒</span> 비밀 댓글 (작가와 나만 볼 수 있어요)
              </span>
            </label>
            <button
              onClick={submit}
              disabled={!body.trim() || submitting}
              className={(body.trim() && !submitting ? "bg-brand hover:bg-brand-hover text-white" : "bg-hairline text-muted") + " h-9 rounded px-5 text-[13px] font-bold transition"}
            >
              {submitting ? "등록 중..." : "등록"}
            </button>
          </div>
        </div>
      ) : (
        <div className="rounded-xl border border-hairline bg-canvas py-5 text-center text-sm text-muted">
          댓글을 남기려면 <a href="/login" className="font-bold text-brand hover:underline">로그인</a>이 필요해요.
        </div>
      )}
    </div>
  );
}

function CommentItem({ comment, isMine, canDelete, onDelete }: {
  comment: Comment;
  isMine: boolean;
  canDelete: boolean;
  onDelete: () => void;
}) {
  const nick = comment.profiles?.nickname ?? "익명";
  const date = new Date(comment.created_at).toLocaleDateString("ko-KR", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });

  return (
    <div className={"rounded-xl border p-4 " + (comment.is_secret ? "border-[#e3dfff] bg-[#f9f8ff]" : "border-hairline bg-white")}>
      <div className="mb-2 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-wash text-[11px] font-bold text-brand">{nick.slice(0, 1)}</div>
          <span className="text-[13px] font-bold text-ink">{nick}</span>
          {isMine && <span className="rounded-full bg-wash px-2 py-0.5 text-[11px] font-bold text-brand">나</span>}
          {comment.is_secret && <span className="flex items-center gap-0.5 rounded-full bg-[#ede9ff] px-2 py-0.5 text-[11px] font-bold text-brand">🔒 비밀</span>}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[11px] text-muted">{date}</span>
          {canDelete && (
            <button onClick={onDelete} className="text-[11px] font-bold text-muted hover:text-error">삭제</button>
          )}
        </div>
      </div>
      <p className="whitespace-pre-wrap text-[15px] leading-[1.7] text-ink">{comment.body}</p>
    </div>
  );
}
