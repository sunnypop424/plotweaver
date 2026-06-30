"""Supabase 클라이언트 싱글턴 (service key = RLS 우회)"""
import os
import httpx
from supabase import create_client, Client

_client: Client | None = None


def _wrap_retry(session, attempts: int = 3) -> None:
    """httpx 세션의 request를 감싸, 유휴 HTTP/2 연결 재사용으로 인한
    'Server disconnected'(RemoteProtocolError) 발생 시 새 연결로 재시도한다.
    RemoteProtocolError가 나면 httpx가 죽은 연결을 풀에서 제거하므로,
    다음 시도는 새 연결을 열어 대부분 성공한다."""
    if getattr(session, "_pw_retry_wrapped", False):
        return
    original = session.request

    def request_with_retry(*args, **kwargs):
        last = None
        for _ in range(attempts):
            try:
                return original(*args, **kwargs)
            except (httpx.RemoteProtocolError, httpx.ConnectError, httpx.ReadError) as e:
                last = e
                continue
        raise last

    session.request = request_with_retry
    session._pw_retry_wrapped = True


def get_db() -> Client:
    global _client
    if _client is None:
        url = os.environ["SUPABASE_URL"]
        key = os.environ["SUPABASE_SERVICE_KEY"]
        _client = create_client(url, key)
        # 테이블 쿼리(postgrest) 세션에 재시도 래퍼 적용
        pg = getattr(_client, "postgrest", None)
        sess = getattr(pg, "session", None)
        if sess is not None:
            _wrap_retry(sess)
    return _client
