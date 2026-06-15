import type { CSSProperties } from "react";
import { INK, TEAL } from "./tokens";

export const fieldLabel: CSSProperties = {
  fontSize: 11,
  color: "#7A7468",
  textTransform: "uppercase",
  letterSpacing: ".06em",
  marginBottom: 6,
};

export const textInput: CSSProperties = {
  width: "100%",
  boxSizing: "border-box",
  background: "#fff",
  border: "1px solid #ece6da",
  borderRadius: 12,
  padding: "11px 12px",
  fontSize: 15,
  color: INK,
  fontFamily: "inherit",
};

export const primaryBtn: CSSProperties = {
  display: "block",
  width: "100%",
  textAlign: "center",
  cursor: "pointer",
  border: "none",
  padding: "13px 16px",
  borderRadius: 14,
  background: TEAL,
  color: "#fff",
  fontWeight: 600,
  fontSize: 15,
  fontFamily: "inherit",
};

export const secondaryBtn: CSSProperties = {
  display: "block",
  cursor: "pointer",
  padding: "12px 16px",
  borderRadius: 14,
  background: "#fff",
  border: "1px solid #ece6da",
  color: INK,
  fontWeight: 600,
  fontSize: 14,
  fontFamily: "inherit",
};
