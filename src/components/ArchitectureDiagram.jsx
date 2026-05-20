

const ArchitectureDiagram = () => {
  return (
    <div className="glass architecture-viz">
      <div className="insights-header">
        <h3><i className="fa-solid fa-network-wired"></i> System Architecture</h3>
        <p className="sub-text">How we process your views in real-time</p>
      </div>
      <div className="diagram-container">
        <div className="node node-client">React UI (Vite)</div>
        <div className="animated-path">
          <div className="packet"></div>
        </div>
        <div className="node node-service">Express API (JWT)</div>
        <div className="animated-path">
          <div className="packet delay-1"></div>
        </div>
        <div className="node node-queue">History Router</div>
        <div className="animated-path">
          <div className="packet delay-2"></div>
        </div>
        <div className="node node-service">SQLite Engine</div>
        <div className="animated-path">
          <div className="packet delay-3"></div>
        </div>
        <div className="node node-db">database.sqlite</div>
      </div>
    </div>
  );
};

export default ArchitectureDiagram;
