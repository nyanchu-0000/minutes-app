import React from "react";
import { Link } from "react-router-dom";
import type { Minute } from "../types/minutes";

const DUMMY_MINUTES: Minute[] = [
    {
        id: "1",
        date: "2024-05-20",
        attendeesMem: "田中 佐藤 鈴木",
        attendeesSf: "山本",
        content: "1. 先週の進捗確認\n2. 今週の予定\n3. 課題共有...",
        createdAt: "2024-05-20T10:00:00Z",
        updatedAt: "2024-05-20T11:00:00Z",
    },
    {
        id: "2",
        date: "2024-05-22",
        attendeesMem: "山田 高橋",
        attendeesSf: "",
        content: "新規機能の要件定義について議論した。",
        createdAt: "2024-05-22T14:00:00Z",
        updatedAt: "2024-05-22T15:30:00Z",
    },
];

export const MinutesList: React.FC = () => {
    return (
        <div className="minutes-list-page">
            <div className="page-header">
                <h2>議事録一覧</h2>
                <Link to="/new" className="button primary">
                    新規作成
                </Link>
            </div>

            <div className="minutes-grid">
                {DUMMY_MINUTES.map((minute) => (
                    <div key={minute.id} className="minute-card">
                        <h3 className="minute-title">{minute.date}</h3>
                        <div className="minute-meta">
                            <p>
                                <strong>MEM:</strong> {minute.attendeesMem}
                            </p>
                            <p>
                                <strong>SF:</strong> {minute.attendeesSf}
                            </p>
                        </div>
                        <p className="minute-preview">
                            {minute.content.length > 50
                                ? `${minute.content.substring(0, 50)}...`
                                : minute.content}
                        </p>
                        <div className="minute-actions">
                            <Link
                                to={`/edit/${minute.id}`}
                                className="button secondary small"
                            >
                                編集
                            </Link>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};
