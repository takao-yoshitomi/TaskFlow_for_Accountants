
// supabase-client.jsからSupabaseクライアントをインポート
import { supabase } from './supabase-client.js';

// ページの読み込みが完了したら実行
document.addEventListener('DOMContentLoaded', async () => {
    // --- DOM要素の取得 ---
    const tasksTableBody = document.querySelector('#tasks-table tbody');
    const signinButton = document.getElementById('signin-button');
    const signoutButton = document.getElementById('signout-button-menu');
    const authModal = document.getElementById('auth-modal');
    const userInfoDiv = document.getElementById('user-info-menu');
    const userNameSpan = document.getElementById('user-name-menu');
    const userEmailSpan = document.getElementById('user-email-menu');
    const userAvatarImg = document.getElementById('user-avatar-menu');

    // --- 認証関連の処理 ---
    const checkUserSession = async () => {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (error) {
            console.error('セッション取得エラー', error);
            return;
        }

        if (session && session.user) {
            // ユーザーがログインしている場合
            authModal.style.display = 'none';
            displayUserInfo(session.user);
            loadTasks(); // タスクを読み込む
        } else {
            // ユーザーがログインしていない場合
            authModal.style.display = 'flex';
        }
    };

    const displayUserInfo = (user) => {
        userNameSpan.textContent = user.user_metadata?.full_name || user.email;
        userEmailSpan.textContent = user.email;
        if (user.user_metadata?.avatar_url) {
            userAvatarImg.src = user.user_metadata.avatar_url;
            userAvatarImg.style.display = 'inline-block';
        }
    };

    signinButton.addEventListener('click', async () => {
        const { error } = await supabase.auth.signInWithOAuth({ provider: 'google' });
        if (error) console.error('ログインエラー', error);
    });

    signoutButton.addEventListener('click', async () => {
        const { error } = await supabase.auth.signOut();
        if (error) console.error('ログアウトエラー', error);
        else window.location.reload(); // ログアウト後にリロード
    });

    // --- メインのデータ処理 ---

    // タスクデータを取得してテーブルに表示するメイン関数
    async function loadTasks() {
        if (!tasksTableBody) return;

        try {
            tasksTableBody.innerHTML = '<tr><td colspan="7" style="text-align:center; padding: 20px;">読み込み中...</td></tr>';

            const { data: tasks, error } = await supabase
                .from('tasks')
                .select(`
                    *,
                    clients (name),
                    staff_requester:staffs!tasks_staff_id_fkey (name),
                    staff_assignee:staffs!tasks_assignee_id_fkey (name)
                `)
                .order('created_at', { ascending: false });

            if (error) {
                throw error;
            }

            renderTasks(tasks);

        } catch (e) {
            console.error('タスクの読み込みに失敗しました', e);
            tasksTableBody.innerHTML = '<tr><td colspan="7" style="text-align:center; padding: 20px; color: red;">データの読み込みに失敗しました。</td></tr>';
        }
    }

    // テーブルにタスクデータを描画する関数
    function renderTasks(tasks) {
        tasksTableBody.innerHTML = '';

        if (tasks.length === 0) {
            tasksTableBody.innerHTML = '<tr><td colspan="7" style="text-align:center; padding: 20px;">表示するタスクがありません。</td></tr>';
            return;
        }

        tasks.forEach(task => {
            const tr = document.createElement('tr');
            const statusBadge = getStatusBadge(task.status);

            tr.innerHTML = `
                <td>${escapeHTML(task.priority) || 'ー'}</td>
                <td>${escapeHTML(task.task_title) || '名称未設定'}</td>
                <td>${escapeHTML(task.clients?.name) || '未割り当て'}</td>
                <td>${escapeHTML(task.staff_requester?.name) || '不明'}</td>
                <td>${escapeHTML(task.staff_assignee?.name) || '未担当'}</td>
                <td>${task.due_date || '期限なし'}</td>
                <td>${statusBadge}</td>
            `;
            tasksTableBody.appendChild(tr);
        });
    }

    // ステータスバッジのHTMLを生成する関数
    function getStatusBadge(status) {
        let className = 'status-default';
        switch (status) {
            case '依頼中': className = 'status-requested'; break;
            case '作業中': className = 'status-inprogress'; break;
            case '作業完了': className = 'status-done'; break;
            case '確認完了': className = 'status-confirmed'; break;
        }
        return `<span class="status-badge ${className}">${escapeHTML(status)}</span>`;
    }

    // HTMLエスケープ関数 (XSS対策)
    function escapeHTML(str) {
        if (str === null || str === undefined) return '';
        return str.toString()
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }

    // --- 初期化処理 ---
    checkUserSession();
});
