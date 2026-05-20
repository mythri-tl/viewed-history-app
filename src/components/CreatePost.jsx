import { API_BASE_URL } from '../config';
import { useState, useRef } from 'react';

const CreatePost = ({ onPostCreated }) => {
  const [content, setContent] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [hashtags, setHashtags] = useState('');
  const [isExpanded, setIsExpanded] = useState(false);
  const [showHashtagInput, setShowHashtagInput] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const fileInputRef = useRef(null);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setErrorMsg('Please select a valid image file.');
      return;
    }

    // Limit to 5MB file size for safety
    if (file.size > 5 * 1024 * 1024) {
      setErrorMsg('Image file size must be less than 5MB.');
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setImageUrl(reader.result);
      setErrorMsg('');
    };
    reader.onerror = () => {
      setErrorMsg('Failed to read image file.');
    };
    reader.readAsDataURL(file);
  };

  const handleClearImage = () => {
    setImageUrl('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!content.trim()) return;

    setLoading(true);
    setErrorMsg('');

    const token = localStorage.getItem('token');
    
    try {
      const response = await fetch(`${API_BASE_URL}/api/posts`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ content, imageUrl, hashtags })
      });

      const data = await response.json();

      if (response.ok) {
        setContent('');
        handleClearImage();
        setHashtags('');
        setIsExpanded(false);
        setShowHashtagInput(false);
        // Bubble up the new post so the feed can prepend it without refreshing
        if (onPostCreated) onPostCreated(data.post);
      } else {
        setErrorMsg(data.message || 'Failed to create post');
      }
    } catch {
      setErrorMsg('Server connection failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="create-post-card glass" style={{ marginBottom: '24px', padding: '20px', borderRadius: 'var(--border-radius-lg)', background: 'rgba(255, 255, 255, 0.75)', transition: 'all 0.3s ease' }}>
      {errorMsg && (
        <div style={{ color: 'var(--danger)', marginBottom: '12px', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <i className="fa-solid fa-circle-exclamation"></i> {errorMsg}
        </div>
      )}
      <form onSubmit={handleSubmit}>
        {/* Hidden File Input for Native media access */}
        <input 
          type="file" 
          ref={fileInputRef} 
          onChange={handleFileChange} 
          accept="image/*" 
          style={{ display: 'none' }} 
        />

        <div style={{ display: 'flex', gap: '14px' }}>
          <img 
            src="https://ui-avatars.com/api/?name=User&background=0a66c2&color=fff" 
            alt="You" 
            style={{ width: '48px', height: '48px', borderRadius: '50%', border: '2px solid white', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }} 
          />
          <textarea 
            placeholder="Share an insight or write a post..." 
            value={content}
            onChange={(e) => setContent(e.target.value)}
            onFocus={() => setIsExpanded(true)}
            style={{ 
              flex: 1, 
              border: '1px solid var(--border-color)', 
              borderRadius: 'var(--border-radius-md)', 
              padding: '14px', 
              resize: 'none', 
              minHeight: isExpanded ? '110px' : '48px', 
              outline: 'none', 
              background: 'white', 
              fontFamily: 'inherit',
              fontSize: '0.95rem',
              transition: 'all 0.3s ease',
              boxShadow: isExpanded ? '0 4px 12px rgba(10, 102, 194, 0.05)' : 'none'
            }}
          />
        </div>

        {/* Live Visual Media Preview */}
        {imageUrl.trim() && (
          <div style={{ marginTop: '16px', marginLeft: '62px', borderRadius: 'var(--border-radius-md)', overflow: 'hidden', border: '1px solid var(--border-color)', position: 'relative' }}>
            <img 
              src={imageUrl} 
              alt="Live post preview" 
              style={{ width: '100%', maxHeight: '240px', objectFit: 'cover', display: 'block' }}
              onError={(e) => { e.target.style.display = 'none'; }}
            />
            <button 
              type="button" 
              onClick={handleClearImage}
              style={{ position: 'absolute', right: '10px', top: '10px', background: 'rgba(0,0,0,0.6)', color: 'white', border: 'none', borderRadius: '50%', width: '28px', height: '28px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            >
              <i className="fa-solid fa-xmark"></i>
            </button>
          </div>
        )}
        
        {isExpanded && (
          <div style={{ marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '12px', paddingLeft: '62px' }}>
            {showHashtagInput && (
              <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                <i className="fa-solid fa-hashtag" style={{ position: 'absolute', left: '12px', color: 'var(--text-muted)' }}></i>
                <input 
                  type="text" 
                  placeholder="Add tags separated by spaces (e.g. #Backend #Nodejs)" 
                  value={hashtags}
                  onChange={(e) => setHashtags(e.target.value)}
                  style={{ width: '100%', padding: '10px 12px 10px 36px', borderRadius: 'var(--border-radius-sm)', border: '1px solid var(--border-color)', background: 'white', outline: 'none', fontSize: '0.9rem' }}
                />
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '8px', borderTop: '1px solid var(--border-color)', paddingTop: '12px' }}>
              {/* LinkedIn Quick Actions Bar */}
              <div style={{ display: 'flex', gap: '16px' }}>
                <button 
                  type="button" 
                  onClick={() => fileInputRef.current && fileInputRef.current.click()} 
                  style={{ background: 'transparent', border: 'none', color: imageUrl ? 'var(--primary-blue)' : 'var(--text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', fontWeight: '600' }}
                >
                  <i className="fa-regular fa-image" style={{ fontSize: '1.1rem', color: '#378fe9' }}></i> Photo
                </button>
                <button 
                  type="button" 
                  onClick={() => setShowHashtagInput(!showHashtagInput)} 
                  style={{ background: 'transparent', border: 'none', color: showHashtagInput ? 'var(--primary-blue)' : 'var(--text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', fontWeight: '600' }}
                >
                  <i className="fa-solid fa-hashtag" style={{ fontSize: '1.1rem', color: '#7fc15e' }}></i> Hashtag
                </button>
              </div>

              {/* Publisher Actions */}
              <div style={{ display: 'flex', gap: '12px' }}>
                <button 
                  type="button" 
                  onClick={() => { 
                    setIsExpanded(false); 
                    setShowHashtagInput(false); 
                    handleClearImage(); 
                    setHashtags(''); 
                  }} 
                  style={{ padding: '8px 16px', borderRadius: '20px', border: 'none', background: 'transparent', color: 'var(--text-muted)', cursor: 'pointer', fontWeight: '600', fontSize: '0.85rem' }}
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  disabled={loading || !content.trim()} 
                  style={{ 
                    padding: '8px 24px', 
                    borderRadius: '20px', 
                    border: 'none', 
                    background: 'var(--primary-blue)', 
                    color: 'white', 
                    cursor: loading || !content.trim() ? 'not-allowed' : 'pointer', 
                    fontWeight: '600', 
                    opacity: loading || !content.trim() ? 0.5 : 1,
                    fontSize: '0.85rem',
                    boxShadow: '0 2px 8px rgba(10, 102, 194, 0.25)'
                  }}
                >
                  {loading ? 'Posting...' : 'Post'}
                </button>
              </div>
            </div>
          </div>
        )}
      </form>
    </div>
  );
};

export default CreatePost;
