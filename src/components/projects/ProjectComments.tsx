'use client';

import React, { useState, useEffect } from 'react';
import { MessageCircle, Send, Trash2, Loader2, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { getProjectComments, addComment, deleteComment, type CommentData } from '@/actions/comments';
import { format } from 'date-fns';
import { pl } from 'date-fns/locale';

interface ProjectCommentsProps {
    projectId: number;
}

export function ProjectComments({ projectId }: ProjectCommentsProps) {
    const [comments, setComments] = useState<CommentData[]>([]);
    const [loading, setLoading] = useState(true);
    const [newComment, setNewComment] = useState('');
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        loadComments();
    }, [projectId]);

    const loadComments = async () => {
        setLoading(true);
        const data = await getProjectComments(projectId);
        setComments(data);
        setLoading(false);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newComment.trim()) return;

        setSubmitting(true);
        const result = await addComment(projectId, newComment.trim());
        if (result.success) {
            setNewComment('');
            loadComments();
            toast.success('Komentarz dodany');
        } else {
            toast.error(result.error);
        }
        setSubmitting(false);
    };

    const handleDelete = async (id: number) => {
        const result = await deleteComment(id);
        if (result.success) {
            loadComments();
            toast.success('Komentarz usunięty');
        } else {
            toast.error(result.error);
        }
    };

    return (
        <div className="space-y-4">
            <div className="flex items-center gap-2 mb-4">
                <MessageCircle className="w-5 h-5 text-primary" />
                <h3 className="font-semibold">Komentarze ({comments.length})</h3>
            </div>

            {/* Add Comment Form */}
            <form onSubmit={handleSubmit} className="space-y-2">
                <Textarea
                    placeholder="Dodaj komentarz..."
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    className="min-h-[80px]"
                />
                <div className="flex justify-end">
                    <Button type="submit" size="sm" disabled={submitting || !newComment.trim()}>
                        {submitting ? (
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        ) : (
                            <Send className="w-4 h-4 mr-2" />
                        )}
                        Wyślij
                    </Button>
                </div>
            </form>

            {/* Comments List */}
            {loading ? (
                <div className="flex justify-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                </div>
            ) : comments.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                    Brak komentarzy. Dodaj pierwszy!
                </p>
            ) : (
                <div className="space-y-3">
                    {comments.map((comment) => (
                        <div
                            key={comment.id}
                            className="p-3 rounded-lg bg-muted/30 border group"
                        >
                            <div className="flex items-start justify-between gap-2">
                                <div className="flex items-center gap-2 mb-1">
                                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                                        <User className="w-4 h-4 text-primary" />
                                    </div>
                                    <div>
                                        <p className="font-medium text-sm">{comment.author}</p>
                                        <p className="text-xs text-muted-foreground">
                                            {format(new Date(comment.createdAt), 'dd MMM yyyy, HH:mm', { locale: pl })}
                                        </p>
                                    </div>
                                </div>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="opacity-0 group-hover:opacity-100 transition-opacity h-7 w-7"
                                    onClick={() => handleDelete(comment.id)}
                                >
                                    <Trash2 className="w-3 h-3 text-destructive" />
                                </Button>
                            </div>
                            <p className="text-sm mt-2 whitespace-pre-wrap">{comment.content}</p>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
