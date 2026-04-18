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
        // localStorage -> sessionStorage に変更
        const savedMeta = sessionStorage.getItem(STORAGE_KEY_META);
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
    const [suggestionPos, setSuggestionPos] = useState<{
        top?: number;
        bottom?: number;
        left: number;
    }>({ top: 0, left: 0 });
    const contentRef = useRef<HTMLDivElement>(null);

    // 初期化処理
    useEffect(() => {
        if (contentRef.current) {
            // localStorage -> sessionStorage に変更
            const savedContent = sessionStorage.getItem(STORAGE_KEY_CONTENT);

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
            // localStorage -> sessionStorage に変更
            sessionStorage.removeItem(STORAGE_KEY_META);
            sessionStorage.removeItem(STORAGE_KEY_CONTENT);

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

    // フォームデータが変更されたら保存
    useEffect(() => {
        // localStorage -> sessionStorage に変更
        sessionStorage.setItem(STORAGE_KEY_META, JSON.stringify(formData));
    }, [formData]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData((prev) => ({ ...prev, [name]: value }));
    };

    const handleSfBlur = (e: React.FocusEvent<HTMLInputElement>) => {
        const value = e.target.value;
        if (!value) return;

        const names = value
            .split(/[、,，]/)
            .map((s) => s.trim())
            .filter(Boolean);

        const formatted = names
            .map((name) => {
                return name.endsWith("様") ? name : `${name}様`;
            })
            .join("、");

        setFormData((prev) => ({ ...prev, attendeesSf: formatted }));
    };

    const updateStyles = () => {
        if (!contentRef.current) return;

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
        setTimeout(() => {
            checkSuggestionTrigger();
            updateStyles();
        }, 50);

        if (contentRef.current) {
            // localStorage -> sessionStorage に変更
            sessionStorage.setItem(
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

        if (node.nodeType === Node.TEXT_NODE) {
            const text = node.textContent || "";
            const offset = range.startOffset;

            if (
                offset > 0 &&
                (text[offset - 1] === "（" || text[offset - 1] === "(")
            ) {
                const rect = range.getBoundingClientRect();
                const MODAL_HEIGHT = 200;
                const spaceBelow = window.innerHeight - rect.bottom;
                if (spaceBelow < MODAL_HEIGHT) {
                    setSuggestionPos({
                        bottom: window.innerHeight - rect.top + 5,
                        left: rect.left,
                    });
                } else {
                    setSuggestionPos({
                        top: rect.bottom + 5,
                        left: rect.left,
                    });
                }
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

        if (node.nodeType === Node.TEXT_NODE) {
            const text = node.textContent || "";
            const offset = range.startOffset;

            if (offset >= 2) {
                const charBeforeParen = text[offset - 2];
                if (charBeforeParen !== "。") {
                    (node as Text).insertData(offset - 1, "。");
                }
            }
        }

        let finalName = name;
        if (type === "SF" && !name.endsWith("様")) {
            finalName = name + "様";
        }

        const textToInsert =
            type === "MEM" ? `MEM）` : `SF${finalName}）`;

        const textNode = document.createTextNode(textToInsert);
        range.insertNode(textNode);

        range.setStartAfter(textNode);
        range.setEndAfter(textNode);
        selection.removeAllRanges();
        selection.addRange(range);

        setShowSuggestions(false);
        updateStyles();

        if (contentRef.current) {
            // localStorage -> sessionStorage に変更
            sessionStorage.setItem(
                STORAGE_KEY_CONTENT,
                contentRef.current.innerHTML
            );
        }

        if (contentRef.current) {
            contentRef.current.focus();
        }
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
    };

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
                        <label htmlFor="attendeesMem">参加者（社内）</label>
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
                        <label htmlFor="attendeesSf">参加者（クライアント）</label>
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
                                        bottom: suggestionPos.bottom,
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

                                    {memSuggestions.length > 0 && (
                                        <div style={{ marginBottom: "0.5rem" }}>
                                            <div
                                                style={{
                                                    fontSize: "0.75rem",
                                                    color: "#999",
                                                    marginBottom: "2px",
                                                }}
                                            >
                                                社内
                                            </div>
                                            <div
                                                style={{
                                                    display: "flex",
                                                    flexWrap: "wrap",
                                                    gap: "0.5rem",
                                                }}
                                            >
                                                <button
                                                    type="button"
                                                    onMouseDown={(e) => {
                                                        e.preventDefault();
                                                        insertSuggestion("", "MEM");
                                                    }}
                                                    style={{
                                                        padding: "0.25rem 0.5rem",
                                                        fontSize: "0.9rem",
                                                        borderRadius: "12px",
                                                        border: "1px solid #ccc",
                                                        background: "#e3f2fd",
                                                        cursor: "pointer",
                                                        color: "#333",
                                                        whiteSpace: "nowrap",
                                                    }}
                                                >
                                                    MEM
                                                </button>
                                            </div>
                                        </div>
                                    )}

                                    {sfSuggestions.length > 0 && (
                                        <div>
                                            <div
                                                style={{
                                                    fontSize: "0.75rem",
                                                    color: "#999",
                                                    marginBottom: "2px",
                                                }}
                                            >
                                                クライアント
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