document.addEventListener('DOMContentLoaded', () => {
    // Privacy Modal Logic
    const privacyBtn = document.getElementById('privacy-btn');
    const privacyModal = document.getElementById('privacy-modal');
    const closeModalBtn = document.getElementById('close-modal');

    privacyBtn.addEventListener('click', () => {
        privacyModal.classList.add('active');
    });

    closeModalBtn.addEventListener('click', () => {
        privacyModal.classList.remove('active');
    });

    // Close modal when clicking outside of it
    privacyModal.addEventListener('click', (e) => {
        if (e.target === privacyModal) {
            privacyModal.classList.remove('active');
        }
    });

    // Button interactions
    const continueBtns = document.querySelectorAll('.btn-secondary, .btn-primary-sm');
    continueBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            const originalText = this.innerHTML;
            this.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Loading...';
            
            setTimeout(() => {
                this.innerHTML = originalText;
                // Add a subtle ripple or completion effect here if desired
            }, 800);
        });
    });

    // Filter button active state toggle
    const filterBtn = document.querySelector('.filter-btn');
    filterBtn.addEventListener('click', function() {
        this.classList.toggle('active');
        if(this.classList.contains('active')) {
            this.style.background = 'var(--primary-light)';
            this.style.color = 'var(--primary-blue)';
            this.style.borderColor = 'var(--primary-light)';
        } else {
            this.style.background = 'white';
            this.style.color = 'inherit';
            this.style.borderColor = 'var(--border-color)';
        }
    });
});
