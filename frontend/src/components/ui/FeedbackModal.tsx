'use client';

import React, { useState, useEffect } from 'react';
import useFlowStore from '@/store/flowStore';
import { Star, MessageSquare, Send, X, CheckCircle } from 'lucide-react';

export default function FeedbackModal() {
  const { feedbackPrompt, submitFeedback, dismissFeedback } = useFlowStore();
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    if (feedbackPrompt) {
      // eslint-disable-next-line
      setRating(0);
      setHoverRating(0);
      setComment('');
      setSubmitted(false);
      setIsSubmitting(false);
    }
  }, [feedbackPrompt]);

  if (!feedbackPrompt) return null;

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      await submitFeedback(rating, 'recovery_worked', comment);
      setSubmitted(true);
      setTimeout(() => {
        dismissFeedback();
      }, 2000);
    } catch (e) {
      console.error(e);
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-md p-4">
      <div className="bg-[#1e1e1e]/90 border border-gray-700/50 rounded-2xl shadow-2xl max-w-lg w-full flex flex-col overflow-hidden animate-in fade-in zoom-in duration-300">
        
        {/* Header */}
        <div className="p-6 border-b border-gray-800/50 bg-gradient-to-r from-indigo-500/10 to-purple-500/10 flex items-start justify-between">
          <div>
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-indigo-400" />
              Workflow Execution Feedback
            </h2>
            <p className="text-sm text-gray-400 mt-1">
              Your workflow <span className="font-mono text-gray-300">{feedbackPrompt.workflow_id.slice(0, 8)}</span> has completed. Did the AI interventions work smoothly?
            </p>
          </div>
          <button
            onClick={dismissFeedback}
            className="p-2 text-gray-400 hover:text-white hover:bg-gray-700/50 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {submitted ? (
            <div className="flex flex-col items-center justify-center py-8 animate-in zoom-in duration-300">
              <CheckCircle className="w-16 h-16 text-green-500 mb-4" />
              <h3 className="text-xl font-bold text-white mb-2">Thank you!</h3>
              <p className="text-gray-400 text-center">Your feedback has been logged to complain.txt.</p>
            </div>
          ) : (
            <>
              {/* Rating */}
              <div className="space-y-3 flex flex-col items-center">
                <label className="text-sm font-semibold text-gray-300 uppercase tracking-wider">Rate the smoothness</label>
                <div className="flex gap-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      onClick={() => setRating(star)}
                      onMouseEnter={() => setHoverRating(star)}
                      onMouseLeave={() => setHoverRating(0)}
                      className="p-1 focus:outline-none transition-transform hover:scale-110"
                    >
                      <Star
                        className={`w-8 h-8 ${
                          (hoverRating || rating) >= star
                            ? 'fill-yellow-500 text-yellow-500'
                            : 'fill-transparent text-gray-600 hover:text-gray-500'
                        } transition-colors`}
                      />
                    </button>
                  ))}
                </div>
              </div>

              {/* Comment */}
              <div className="space-y-2">
                <label className="text-sm font-semibold text-gray-300 uppercase tracking-wider flex items-center justify-between">
                  <span>How can we improve?</span>
                  <span className="text-xs text-gray-500 font-normal">Optional</span>
                </label>
                <textarea
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="If you faced any problems, describe how to better solve them..."
                  className="w-full h-32 bg-black/40 border border-gray-700 rounded-xl p-4 text-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all resize-none"
                />
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        {!submitted && (
          <div className="p-4 border-t border-gray-800/50 bg-[#252525]/50 flex justify-end">
            <button
              onClick={handleSubmit}
              disabled={rating === 0 || isSubmitting}
              className="flex items-center gap-2 px-6 py-2.5 rounded-lg bg-indigo-600 text-white font-medium hover:bg-indigo-700 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
              <span>Submit Feedback</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
