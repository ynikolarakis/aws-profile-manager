import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useStore } from "@/store";

interface Props {
  data: Record<string, unknown>;
  onClose: () => void;
}

export function CostExplorer({ data, onClose }: Props) {
  const profile = (data.profile as string) || "";
  const getCost = useStore((s) => s.getCost);
  const costData = useStore((s) => s.costData);

  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    getCost(profile, year, month).then(() => setLoading(false));
  }, [profile, year, month, getCost]);

  useEffect(() => {
    if (costData) setLoading(false);
  }, [costData]);

  const maxCost = costData?.services?.[0]?.cost || 1;

  const handlePrev = () => {
    if (month === 1) {
      setYear(year - 1);
      setMonth(12);
    } else {
      setMonth(month - 1);
    }
  };

  const handleNext = () => {
    if (month === 12) {
      setYear(year + 1);
      setMonth(1);
    } else {
      setMonth(month + 1);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,.5)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 100,
      }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ duration: 0.15 }}
        style={{
          background: "var(--bg-1)",
          border: "1px solid var(--border)",
          borderRadius: "var(--r-lg)",
          padding: 24,
          width: 480,
          maxHeight: "80vh",
          overflowY: "auto",
        }}
      >
        <h2 style={{ fontSize: 15, fontWeight: 600, marginBottom: 4 }}>
          Cost Explorer
        </h2>
        <div style={{ fontSize: 12, color: "var(--t3)", marginBottom: 16 }}>
          {profile}
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
          <button onClick={handlePrev} style={{ fontSize: 14, color: "var(--t2)", padding: "4px 8px", borderRadius: "var(--r)", border: "1px solid var(--border)" }}>
            &#8592;
          </button>
          <span style={{ fontSize: 13, fontWeight: 500 }}>
            {year}-{String(month).padStart(2, "0")}
          </span>
          <button onClick={handleNext} style={{ fontSize: 14, color: "var(--t2)", padding: "4px 8px", borderRadius: "var(--r)", border: "1px solid var(--border)" }}>
            &#8594;
          </button>
        </div>

        {loading ? (
          <div style={{ textAlign: "center", padding: 40, color: "var(--t3)" }}>Loading...</div>
        ) : costData?.error ? (
          <div style={{ textAlign: "center", padding: 40, color: "var(--red)" }}>{costData.error}</div>
        ) : (
          <>
            <div style={{ fontSize: 28, fontWeight: 700, color: "var(--ac)", marginBottom: 16 }}>
              ${costData?.total?.toFixed(2)}
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {costData?.services?.map((svc) => (
                <div key={svc.name}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 2 }}>
                    <span style={{ fontSize: 11, color: "var(--t2)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 300 }}>
                      {svc.name}
                    </span>
                    <span style={{ fontSize: 11, fontFamily: "var(--mono)", color: "var(--t3)" }}>
                      ${svc.cost.toFixed(2)}
                    </span>
                  </div>
                  <div style={{ height: 4, borderRadius: 2, background: "var(--bg-3)", overflow: "hidden" }}>
                    <div
                      style={{
                        height: "100%",
                        width: `${(svc.cost / maxCost) * 100}%`,
                        background: "var(--ac)",
                        borderRadius: 2,
                        transition: "width .3s var(--ease)",
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 20 }}>
          <button
            onClick={onClose}
            style={{
              height: 32,
              padding: "0 16px",
              fontSize: 12,
              fontWeight: 500,
              color: "var(--t2)",
              borderRadius: "var(--r)",
              border: "1px solid var(--border)",
            }}
          >
            Close
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
