import React from "react";

type Props = {
  heading?: string;
  previewText?: string;
};

const WaitlistThanks: React.FC<Props> = ({
  heading = "You're on the waitlist 🎉",
  previewText = "Thanks for signing up! We'll keep you posted with updates and early access.",
}) => {
  return (
    <div
      style={{
        backgroundColor: "#0b1020",
        padding: "24px 0",
        width: "100%",
        fontFamily: "Arial, sans-serif",
      }}
    >
      {/* Preview text for clients that support it */}
      <span
        style={{
          display: "none",
          fontSize: 1,
          color: "transparent",
          lineHeight: 1,
          maxHeight: 0,
          maxWidth: 0,
          opacity: 0,
          overflow: "hidden",
        }}
      >
        {previewText}
      </span>

      <table
        role="presentation"
        width="100%"
        cellPadding={0}
        cellSpacing={0}
        style={{ margin: 0, borderCollapse: "collapse" }}
      >
        <tbody>
          <tr>
            <td align="center">
              <table
                role="presentation"
                width={600}
                cellPadding={0}
                cellSpacing={0}
                style={{ margin: "0 auto", borderCollapse: "collapse" }}
              >
                <tbody>
                  <tr>
                    <td
                      style={{
                        background: "#7c3aed",
                        padding: "24px 32px",
                        color: "#ffffff",
                        fontSize: 22,
                        fontWeight: 700,
                        textAlign: "center",
                        borderTopLeftRadius: 12,
                        borderTopRightRadius: 12,
                      }}
                    >
                      Slinko
                    </td>
                  </tr>

                  <tr>
                    <td
                      style={{
                        background: "#ffffff",
                        padding: 32,
                        borderBottomLeftRadius: 12,
                        borderBottomRightRadius: 12,
                        color: "#0f172a",
                      }}
                    >
                      <h2
                        style={{
                          margin: "0 0 12px",
                          fontSize: 20,
                          lineHeight: 1.3,
                          color: "#0f172a",
                        }}
                      >
                        {heading}
                      </h2>

                      <p
                        style={{
                          margin: "0 0 12px",
                          fontSize: 16,
                          color: "#334155",
                        }}
                      >
                        Thanks for signing up! You're officially on the Slinko
                        waitlist. We'll keep you posted with updates and early
                        access to Plinko.
                      </p>

                      <p
                        style={{
                          margin: "0 0 12px",
                          fontSize: 16,
                          color: "#334155",
                        }}
                      >
                        In the meantime, stay tuned—degen times ahead.
                      </p>

                      <hr
                        style={{
                          border: "none",
                          borderTop: "1px solid #e2e8f0",
                          margin: "16px 0",
                        }}
                      />

                      <p
                        style={{
                          margin: 0,
                          fontSize: 12,
                          color: "#64748b",
                        }}
                      >
                        If you didn't request this, you can ignore this email.
                      </p>
                    </td>
                  </tr>

                  <tr>
                    <td style={{ height: 32 }} />
                  </tr>
                </tbody>
              </table>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
};

export default WaitlistThanks;