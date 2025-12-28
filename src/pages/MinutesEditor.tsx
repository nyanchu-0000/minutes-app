import React, { useState, useEffect, useRef } from "react";
import type { Minute } from "../types/minutes";

const STORAGE_KEY_META = "minutes-draft-meta";
const STORAGE_KEY_CONTENT = "minutes-draft-content";

const INITIAL_CONTENT_HTML =
    '<div style="font-size: 12pt">【】</div>' +
    '<div style="font-size: 11pt"><br></div>'.repeat(4) +
    '<div style="font-size: 12pt">【】</div>' +
    '<div style="font-size: 11pt"><br></div>'.repeat(4) +
    '<div style="font-size: 12pt">【】</div>';

export const MinutesEditor: React.FC = () => {
    const [formData, setFormData] = useState<Partial<Minute>>(() => {
        const savedMeta = localStorage.getItem(STORAGE_KEY_META);
        if (savedMeta) {
            try {
                return JSON.parse(savedMeta);
            } catch (e) {
                console.error("Failed to parse saved metadata", e);
            }
        }
        return {
            attendeesMem: "",
            attendeesSf: "",
            content: "",
        };
    });

    const [showSuggestions, setShowSuggestions] = useState(false);
    const [suggestionPos, setSuggestionPos] = useState({ top: 0, left: 0 });
    const contentRef = useRef<HTMLDivElement>(null);

    // 初期化処理：保存データがあれば復元、なければ初期テンプレートを配置
    useEffect(() => {
        // 本文の復元
        if (contentRef.current) {
            const savedContent = localStorage.getItem(STORAGE_KEY_CONTENT);

            if (savedContent) {
                contentRef.current.innerHTML = savedContent;
            } else if (!contentRef.current.innerHTML) {
                contentRef.current.innerHTML = INITIAL_CONTENT_HTML;
            }
        }
    }, []);

    const handleReset = () => {
        if (
            window.confirm(
                "入力内容を全てリセットしてもよろしいですか？\nこの操作は取り消せません。"
            )
        ) {
            // ローカルストレージから削除
            localStorage.removeItem(STORAGE_KEY_META);
            localStorage.removeItem(STORAGE_KEY_CONTENT);

            // フォームデータをリセット
            setFormData({
                attendeesMem: "",
                attendeesSf: "",
                content: "",
            });

            if (contentRef.current) {
                contentRef.current.innerHTML = INITIAL_CONTENT_HTML;
            }
        }
    };

    // フォームデータ（参加者など）が変更されたら保存
    useEffect(() => {
        localStorage.setItem(STORAGE_KEY_META, JSON.stringify(formData));
    }, [formData]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData((prev) => ({ ...prev, [name]: value }));
    };

    const handleSfBlur = (e: React.FocusEvent<HTMLInputElement>) => {
        const value = e.target.value;
        if (!value) return;

        // 全角・半角のカンマ、読点で分割
        const names = value
            .split(/[、,，]/)
            .map((s) => s.trim())
            .filter(Boolean);

        // 「様」を付与して「、」で結合
        const formatted = names
            .map((name) => {
                return name.endsWith("様") ? name : `${name}様`;
            })
            .join("、");

        setFormData((prev) => ({ ...prev, attendeesSf: formatted }));
    };

    const updateStyles = () => {
        if (!contentRef.current) return;

        // 子要素を走査してスタイルを適用
        const children = Array.from(contentRef.current.children);
        children.forEach((child) => {
            if (child instanceof HTMLElement) {
                if (
                    child.innerText.includes("【") ||
                    child.innerText.includes("】")
                ) {
                    child.style.fontSize = "12pt";
                } else {
                    child.style.fontSize = "11pt";
                }
            }
        });
    };

    const handleInput = () => {
        // IME入力中は発火させない（ブラウザによって挙動が違うため、念のため）
        // ただし、onInputはIME確定時にも走ることがあるので、setTimeoutで逃がすのが確実
        setTimeout(() => {
            checkSuggestionTrigger();
            updateStyles();
        }, 50);

        // 本文が変更されたら保存
        if (contentRef.current) {
            localStorage.setItem(
                STORAGE_KEY_CONTENT,
                contentRef.current.innerHTML
            );
        }
    };

    const handleKeyUp = () => {
        setTimeout(checkSuggestionTrigger, 50);
    };

    const handleCompositionEnd = () => {
        setTimeout(() => {
            checkSuggestionTrigger();
            updateStyles();
        }, 50);
    };

    const handleClick = () => {
        setTimeout(checkSuggestionTrigger, 50);
    };

    const checkSuggestionTrigger = () => {
        const selection = window.getSelection();
        if (!selection || selection.rangeCount === 0) return;

        const range = selection.getRangeAt(0);
        const node = range.startContainer;

        // テキストノードの場合のみ処理
        if (node.nodeType === Node.TEXT_NODE) {
            const text = node.textContent || "";
            const offset = range.startOffset;

            // 全角「（」または半角「(」に対応
            if (
                offset > 0 &&
                (text[offset - 1] === "（" || text[offset - 1] === "(")
            ) {
                const rect = range.getBoundingClientRect();
                setSuggestionPos({
                    top: rect.bottom + window.scrollY + 5,
                    left: rect.left + window.scrollX,
                });
                setShowSuggestions(true);
                return;
            }
        }
        setShowSuggestions(false);
    };

    const insertSuggestion = (name: string, type: "MEM" | "SF") => {
        const selection = window.getSelection();
        if (!selection || selection.rangeCount === 0) return;

        const range = selection.getRangeAt(0);
        const node = range.startContainer;

        // カーソル位置（'（'または'('の直後）から、さらに前の文字を確認する
        if (node.nodeType === Node.TEXT_NODE) {
            const text = node.textContent || "";
            const offset = range.startOffset;

            // offsetは現在のカーソル位置（括弧の後ろ）。
            // text[offset - 1] は括弧
            // text[offset - 2] が括弧の前の文字

            if (offset >= 2) {
                const charBeforeParen = text[offset - 2];
                if (charBeforeParen !== "。") {
                    // '。'がない場合、括弧の前に'。'を挿入する
                    (node as Text).insertData(offset - 1, "。");
                }
            }
        }

        let finalName = name;
        if (type === "SF" && !name.endsWith("様")) {
            finalName = name + "様";
        }

        const textToInsert =
            type === "MEM" ? `MEM${name}）` : `SF${finalName}）`;

        const textNode = document.createTextNode(textToInsert);
        range.insertNode(textNode);

        // カーソルを挿入テキストの後に移動
        range.setStartAfter(textNode);
        range.setEndAfter(textNode);
        selection.removeAllRanges();
        selection.addRange(range);

        setShowSuggestions(false);
        updateStyles();

        // 挿入後も保存
        if (contentRef.current) {
            localStorage.setItem(
                STORAGE_KEY_CONTENT,
                contentRef.current.innerHTML
            );
        }

        // フォーカスを戻す
        if (contentRef.current) {
            contentRef.current.focus();
        }
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        // 保存処理削除
    };

    // 候補リストの生成（スペースではなく「、」区切り）
    const memNames =
        formData.attendeesMem
            ?.split(/[、,，]/)
            .map((s) => s.trim())
            .filter(Boolean) || [];
    const sfNames =
        formData.attendeesSf
            ?.split(/[、,，]/)
            .map((s) => s.trim())
            .filter(Boolean) || [];

    const memSuggestions = memNames.map((name) => ({
        name,
        type: "MEM" as const,
    }));
    const sfSuggestions = sfNames.map((name) => ({
        name,
        type: "SF" as const,
    }));

    return (
        <div className="minutes-editor-page">
            <div className="page-header">
                <h2>新規議事録作成</h2>
                <button
                    type="button"
                    onClick={handleReset}
                    className="button secondary"
                    style={{
                        backgroundColor: "#333",
                        borderColor: "#333",
                        color: "white",
                    }}
                >
                    リセット
                </button>
            </div>

            <form onSubmit={handleSubmit} className="editor-form">
                <div className="form-row">
                    <div className="form-group flex-grow">
                        <label htmlFor="attendeesMem">参加者 (MEM)</label>
                        <input
                            type="text"
                            id="attendeesMem"
                            name="attendeesMem"
                            value={formData.attendeesMem}
                            onChange={handleChange}
                            placeholder="「、」区切りで入力 (例: 山田、田中)"
                            className="form-control"
                            autoComplete="off"
                        />
                    </div>

                    <div className="form-group flex-grow">
                        <label htmlFor="attendeesSf">参加者 (SF)</label>
                        <input
                            type="text"
                            id="attendeesSf"
                            name="attendeesSf"
                            value={formData.attendeesSf}
                            onChange={handleChange}
                            onBlur={handleSfBlur}
                            placeholder="「、」区切りで入力 (例: 佐藤、鈴木)"
                            className="form-control"
                            autoComplete="off"
                        />
                    </div>
                </div>

                <div className="form-group" style={{ position: "relative" }}>
                    <label>内容</label>
                    <div
                        className="content-instruction"
                        style={{
                            fontSize: "0.85em",
                            color: "#666",
                            marginBottom: "0.5rem",
                        }}
                    >
                        ※「・」で1文として記入してください。「（」を入力すると参加者を選択できます。
                        【】がある行は12pt、それ以外は11ptになります。
                    </div>
                    <div style={{ position: "relative" }}>
                        <div
                            ref={contentRef}
                            className="form-control textarea"
                            contentEditable
                            suppressContentEditableWarning
                            onInput={handleInput}
                            onKeyUp={handleKeyUp}
                            onCompositionEnd={handleCompositionEnd}
                            onClick={handleClick}
                            style={{
                                minHeight: "400px",
                                height: "auto",
                                overflowY: "visible",
                                fontFamily: "inherit",
                            }}
                        />

                        {showSuggestions &&
                            (memSuggestions.length > 0 ||
                                sfSuggestions.length > 0) && (
                                <div
                                    className="suggestions-panel"
                                    style={{
                                        position: "fixed",
                                        top: suggestionPos.top,
                                        left: suggestionPos.left,
                                        backgroundColor:
                                            "rgba(255, 255, 255, 0.98)",
                                        border: "1px solid #ddd",
                                        borderRadius: "4px",
                                        boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
                                        padding: "0.5rem",
                                        zIndex: 1000,
                                        display: "flex",
                                        flexDirection: "column",
                                        gap: "0.5rem",
                                        maxWidth: "250px",
                                    }}
                                >
                                    <div
                                        style={{
                                            fontSize: "0.8rem",
                                            color: "#666",
                                            borderBottom: "1px solid #eee",
                                            paddingBottom: "4px",
                                        }}
                                    >
                                        参加者を選択:
                                    </div>

                                    {/* MEM Section */}
                                    {memSuggestions.length > 0 && (
                                        <div style={{ marginBottom: "0.5rem" }}>
                                            <div
                                                style={{
                                                    fontSize: "0.75rem",
                                                    color: "#999",
                                                    marginBottom: "2px",
                                                }}
                                            >
                                                MEM
                                            </div>
                                            <div
                                                style={{
                                                    display: "flex",
                                                    flexWrap: "wrap",
                                                    gap: "0.5rem",
                                                }}
                                            >
                                                {memSuggestions.map((s, i) => (
                                                    <button
                                                        key={`mem-${i}`}
                                                        type="button"
                                                        onMouseDown={(e) => {
                                                            e.preventDefault();
                                                            insertSuggestion(
                                                                s.name,
                                                                s.type
                                                            );
                                                        }}
                                                        style={{
                                                            padding:
                                                                "0.25rem 0.5rem",
                                                            fontSize: "0.9rem",
                                                            borderRadius:
                                                                "12px",
                                                            border: "1px solid #ccc",
                                                            background:
                                                                "#e3f2fd",
                                                            cursor: "pointer",
                                                            color: "#333",
                                                            whiteSpace:
                                                                "nowrap",
                                                        }}
                                                    >
                                                        {s.name}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* SF Section */}
                                    {sfSuggestions.length > 0 && (
                                        <div>
                                            <div
                                                style={{
                                                    fontSize: "0.75rem",
                                                    color: "#999",
                                                    marginBottom: "2px",
                                                }}
                                            >
                                                SF
                                            </div>
                                            <div
                                                style={{
                                                    display: "flex",
                                                    flexWrap: "wrap",
                                                    gap: "0.5rem",
                                                }}
                                            >
                                                {sfSuggestions.map((s, i) => (
                                                    <button
                                                        key={`sf-${i}`}
                                                        type="button"
                                                        onMouseDown={(e) => {
                                                            e.preventDefault();
                                                            insertSuggestion(
                                                                s.name,
                                                                s.type
                                                            );
                                                        }}
                                                        style={{
                                                            padding:
                                                                "0.25rem 0.5rem",
                                                            fontSize: "0.9rem",
                                                            borderRadius:
                                                                "12px",
                                                            border: "1px solid #ccc",
                                                            background:
                                                                "#f3e5f5",
                                                            cursor: "pointer",
                                                            color: "#333",
                                                            whiteSpace:
                                                                "nowrap",
                                                        }}
                                                    >
                                                        {s.name}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                    </div>
                </div>
            </form>
        </div>
    );
};
