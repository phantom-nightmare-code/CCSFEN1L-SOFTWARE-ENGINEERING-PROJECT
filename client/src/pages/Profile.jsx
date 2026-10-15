  const handleSaveProfile = async () => {
    setSaveLoading(true);
    try {
      const response = await fetch(`${API_URL}/users/${user.id}/coach-details`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          full_name: user.full_name,
          experience_years: coachDetails.experience_years,
          expertise: coachDetails.expertise
        })
      });

      if (response.ok) {
        setIsEditing(false);
        alert("Profile saved successfully!"); 
      } else {
        // ✅ FIXED: Reading as text instead of JSON so we see the real error
        const errorText = await response.text();
        alert(`Failed to save. Server said: ${errorText.substring(0, 150)}`);
      }
    } catch (error) {
      console.error("Error saving:", error);
      alert("Network error. Please try again.");
    } finally {
      setSaveLoading(false); 
    }
  };
