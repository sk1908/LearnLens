const API_BASE = 'http://localhost:8000/api';

async function request(endpoint, options = {}) {
    const url = `${API_BASE}${endpoint}`;
    const config = {
        ...options,
        headers: {
            ...(options.body instanceof FormData ? {} : { 'Content-Type': 'application/json' }),
            ...options.headers,
        },
    };

    const response = await fetch(url, config);

    if (!response.ok) {
        const error = await response.json().catch(() => ({ detail: 'An error occurred' }));
        throw new Error(error.detail || `HTTP Error ${response.status}`);
    }

    return response.json();
}

// Documents API
export const documentsAPI = {
    upload: (file) => {
        const formData = new FormData();
        formData.append('file', file);
        return request('/documents/upload', { method: 'POST', body: formData });
    },
    list: () => request('/documents/'),
    get: (id) => request(`/documents/${id}`),
    delete: (id) => request(`/documents/${id}`, { method: 'DELETE' }),
};

// Quizzes API
export const quizzesAPI = {
    generate: (documentId, topic = null, numQuestions = 5, difficulty = null) =>
        request('/quizzes/generate', {
            method: 'POST',
            body: JSON.stringify({
                document_id: documentId,
                topic,
                num_questions: numQuestions,
                difficulty,
            }),
        }),
    answer: (questionId, userAnswer) =>
        request('/quizzes/answer', {
            method: 'POST',
            body: JSON.stringify({
                question_id: questionId,
                user_answer: userAnswer,
            }),
        }),
    hint: (questionId, hintLevel) =>
        request('/quizzes/hint', {
            method: 'POST',
            body: JSON.stringify({
                question_id: questionId,
                hint_level: hintLevel,
            }),
        }),
    get: (quizId) => request(`/quizzes/${quizId}`),
};

// Progress API
export const progressAPI = {
    stats: () => request('/progress/stats'),
    dashboard: () => request('/progress/dashboard'),
};
