/* =====================================================
   RECOMMENDATIONS MODULE — Smart Task Suggestions
   ===================================================== */

const Recommendations = (() => {
    // Category-based suggestion templates
    const SUGGESTION_TEMPLATES = {
        work: [
            { title: 'Review and respond to emails', desc: 'Stay on top of your inbox', priority: 'medium', complexity: 2 },
            { title: 'Prepare for tomorrow\'s meeting', desc: 'Review agenda and prepare talking points', priority: 'high', complexity: 3 },
            { title: 'Update project documentation', desc: 'Keep your docs in sync with current progress', priority: 'medium', complexity: 3 },
            { title: 'Code review pending PRs', desc: 'Help your team by reviewing their code', priority: 'medium', complexity: 4 },
            { title: 'Weekly status update', desc: 'Summarize the week\'s progress', priority: 'medium', complexity: 2 },
            { title: 'Plan sprint tasks', desc: 'Break down upcoming work into manageable chunks', priority: 'high', complexity: 4 },
            { title: 'Clean up workspace', desc: 'Organize files and folders', priority: 'low', complexity: 1 },
        ],
        personal: [
            { title: 'Organize your desk', desc: 'A clean space leads to a clear mind', priority: 'low', complexity: 1 },
            { title: 'Plan meals for the week', desc: 'Save time and eat healthier', priority: 'medium', complexity: 2 },
            { title: 'Call a friend or family member', desc: 'Stay connected with loved ones', priority: 'low', complexity: 1 },
            { title: 'Review monthly budget', desc: 'Track spending and savings', priority: 'medium', complexity: 3 },
            { title: 'Declutter one room', desc: 'Start small, end with a clean space', priority: 'low', complexity: 2 },
            { title: 'Update your calendar', desc: 'Add upcoming events and deadlines', priority: 'medium', complexity: 1 },
        ],
        health: [
            { title: '30-minute workout', desc: 'Get moving — your body will thank you!', priority: 'high', complexity: 3 },
            { title: 'Drink 8 glasses of water', desc: 'Stay hydrated throughout the day', priority: 'medium', complexity: 1 },
            { title: 'Prepare a healthy lunch', desc: 'Fuel your body with good nutrition', priority: 'medium', complexity: 2 },
            { title: '10-minute meditation', desc: 'Take a moment to center yourself', priority: 'medium', complexity: 1 },
            { title: 'Go for a walk', desc: 'Fresh air does wonders for the mind', priority: 'low', complexity: 1 },
            { title: 'Stretch for 15 minutes', desc: 'Release tension and improve flexibility', priority: 'low', complexity: 1 },
            { title: 'Track your sleep', desc: 'Monitor rest patterns for better health', priority: 'medium', complexity: 1 },
        ],
        learning: [
            { title: 'Read for 30 minutes', desc: 'Expand your knowledge one page at a time', priority: 'medium', complexity: 2 },
            { title: 'Watch an educational video', desc: 'Learn something new in an engaging way', priority: 'low', complexity: 1 },
            { title: 'Practice a new skill for 1 hour', desc: 'Deliberate practice makes perfect', priority: 'high', complexity: 4 },
            { title: 'Review study notes', desc: 'Reinforce what you\'ve learned', priority: 'medium', complexity: 2 },
            { title: 'Take an online course lesson', desc: 'Make progress in your learning journey', priority: 'medium', complexity: 3 },
            { title: 'Write a summary of what you learned today', desc: 'Teaching yourself solidifies knowledge', priority: 'medium', complexity: 3 },
        ],
        creative: [
            { title: 'Sketch or doodle for 20 minutes', desc: 'Let your creativity flow freely', priority: 'low', complexity: 2 },
            { title: 'Write a journal entry', desc: 'Reflect on your thoughts and experiences', priority: 'low', complexity: 2 },
            { title: 'Brainstorm new project ideas', desc: 'Let your imagination run wild', priority: 'medium', complexity: 3 },
            { title: 'Practice photography', desc: 'Capture the world around you', priority: 'low', complexity: 2 },
            { title: 'Work on a personal creative project', desc: 'Invest time in your passion', priority: 'medium', complexity: 4 },
        ],
    };

    const CATEGORY_ICONS = {
        work:     '<i class="fa-solid fa-briefcase"></i>',
        personal: '<i class="fa-solid fa-house"></i>',
        health:   '<i class="fa-solid fa-dumbbell"></i>',
        learning: '<i class="fa-solid fa-graduation-cap"></i>',
        creative: '<i class="fa-solid fa-palette"></i>',
    };

    function analyzeCompletedTasks() {
        const tasks = Storage.getTasks();
        const completed = tasks.filter(t => t.status === 'completed');

        if (completed.length < 3) return null;

        // Analyze patterns
        const categoryFreq = {};
        const priorityFreq = {};
        const avgComplexity = {};
        const categoryCount = {};

        completed.forEach(task => {
            // Count categories
            categoryFreq[task.category] = (categoryFreq[task.category] || 0) + 1;

            // Count priorities
            priorityFreq[task.priority] = (priorityFreq[task.priority] || 0) + 1;

            // Average complexity per category
            if (!avgComplexity[task.category]) {
                avgComplexity[task.category] = 0;
                categoryCount[task.category] = 0;
            }
            avgComplexity[task.category] += (task.complexity || 3);
            categoryCount[task.category] += 1;
        });

        // Calculate averages
        Object.keys(avgComplexity).forEach(cat => {
            avgComplexity[cat] = Math.round(avgComplexity[cat] / categoryCount[cat]);
        });

        // Sort categories by frequency
        const topCategories = Object.entries(categoryFreq)
            .sort((a, b) => b[1] - a[1])
            .map(([cat]) => cat);

        return {
            topCategories,
            categoryFreq,
            priorityFreq,
            avgComplexity,
            totalCompleted: completed.length,
        };
    }

    function generateRecommendations() {
        const analysis = analyzeCompletedTasks();
        const existingTasks = Storage.getTasks().filter(t => t.status !== 'completed');
        const existingTitles = new Set(existingTasks.map(t => t.title.toLowerCase()));
        const recommendations = [];

        if (!analysis) {
            // Not enough data — provide general recommendations
            const allCategories = Object.keys(SUGGESTION_TEMPLATES);
            allCategories.forEach(cat => {
                const templates = SUGGESTION_TEMPLATES[cat];
                const picked = templates[Math.floor(Math.random() * templates.length)];
                if (!existingTitles.has(picked.title.toLowerCase())) {
                    recommendations.push({
                        ...picked,
                        category: cat,
                        icon: CATEGORY_ICONS[cat],
                        reason: 'General suggestion',
                    });
                }
            });
            return recommendations.slice(0, 6);
        }

        // Weighted selection: prefer top categories
        const { topCategories, avgComplexity } = analysis;

        // Get suggestions from top categories (more from frequent ones)
        topCategories.forEach((cat, i) => {
            const templates = SUGGESTION_TEMPLATES[cat];
            if (!templates) return;

            const count = Math.max(1, 3 - i); // More suggestions from top categories
            const shuffled = [...templates].sort(() => Math.random() - 0.5);

            for (let j = 0; j < count && j < shuffled.length; j++) {
                const suggestion = shuffled[j];
                if (!existingTitles.has(suggestion.title.toLowerCase())) {
                    recommendations.push({
                        ...suggestion,
                        category: cat,
                        icon: CATEGORY_ICONS[cat],
                        reason: `Based on your ${cat} activity`,
                        // Adjust complexity to match user's average
                        complexity: avgComplexity[cat] || suggestion.complexity,
                    });
                }
            }
        });

        // Add 1-2 from less-used categories for variety
        const lessUsed = Object.keys(SUGGESTION_TEMPLATES).filter(
            cat => !topCategories.includes(cat) || topCategories.indexOf(cat) >= 2
        );
        lessUsed.forEach(cat => {
            const templates = SUGGESTION_TEMPLATES[cat];
            if (!templates) return;
            const picked = templates[Math.floor(Math.random() * templates.length)];
            if (!existingTitles.has(picked.title.toLowerCase())) {
                recommendations.push({
                    ...picked,
                    category: cat,
                    icon: CATEGORY_ICONS[cat],
                    reason: 'Try something different!',
                });
            }
        });

        // Deduplicate and limit
        const unique = [];
        const seen = new Set();
        recommendations.forEach(r => {
            if (!seen.has(r.title)) {
                seen.add(r.title);
                unique.push(r);
            }
        });

        return unique.slice(0, 8);
    }

    return {
        analyzeCompletedTasks,
        generateRecommendations,
        CATEGORY_ICONS,
    };
})();
