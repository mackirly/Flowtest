// Direct profile loading fix
export const loadProfileDirectly = async () => {
    const token = localStorage.getItem('flowtest_access_token');
    if (!token) {
        window.location.href = '/login.html';
        return null;
    }

    try {
        // Load profile data sequentially to ensure we have the base profile
        // before loading activity and stats
        const profileResponse = await fetch('/api/core/profile/', {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!profileResponse.ok) {
            if (profileResponse.status === 401) {
                localStorage.removeItem('flowtest_access_token');
                window.location.href = '/login.html';
                return null;
            }
            throw new Error(`Profile request failed: ${profileResponse.status}`);
        }

        const profile = await profileResponse.json();

        // Load activity and stats in parallel
        const [activityResponse, statsResponse] = await Promise.allSettled([
            fetch('/api/core/activity/?limit=5', {
                headers: { 'Authorization': `Bearer ${token}` }
            }),
            fetch('/api/core/statistics/', {
                headers: { 'Authorization': `Bearer ${token}` }
            })
        ]);

        // Add activity data if available
        if (activityResponse.status === 'fulfilled' && activityResponse.value.ok) {
            const activityData = await activityResponse.value.json();
            profile.activity = activityData;
        }

        // Add stats data if available
        if (statsResponse.status === 'fulfilled' && statsResponse.value.ok) {
            const statsData = await statsResponse.value.json();
            profile.statistics = statsData;
        }

        return profile;
    } catch (error) {
        console.error('Error loading profile data:', error);
        throw error;
    }
};

export default { loadProfileDirectly };