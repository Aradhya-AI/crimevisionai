import os
import json
import logging
from typing import Dict, Any, List, Optional
from app.config import settings

logger = logging.getLogger("crimevision.groq_service")

# Mandatory forensic grounding prompt instructions
FORENSIC_SYSTEM_PROMPT = """You are CrimeVision AI Forensic Assistant, an objective decision-support AI for certified law enforcement and forensic investigators.

CRITICAL OPERATIONAL & LEGAL RULES:
1. STRICT EVIDENCE GROUNDING: Only make assertions backed directly by the provided case evidence context.
2. CITATION MANDATE: Every factual statement MUST cite the specific Evidence ID (e.g., [EVD-XXXX]) and frame/audio timestamp (e.g., [00:04.2s]).
3. UNCERTAINTY & HONESTY: If a detail, person's identity, weapon type, or motive is not present or unverified in the evidence, state explicitly: "This is not established by the available evidence."
4. NO GUILT OR CRIMINAL LABELING: Never declare a person guilty, never state as fact that a crime occurred unless legally certified, and NEVER provide numerical probabilities of guilt.
5. OBJECTS & WEAPONS: Distinguish standard detector labels from verified ballistic/forensic confirmation. If an object resembles a weapon or phone, label it as an "unconfirmed candidate object requiring physical examination."
6. HYPOTHESES: Clearly label all inferences as "INVESTIGATIVE HYPOTHESIS" rather than verified facts.
"""

class GroqForensicService:
    def __init__(self):
        self.api_key = settings.GROQ_API_KEY
        self.model = settings.GROQ_MODEL
        self._client = None

    def _get_client(self):
        if self._client is None and self.api_key:
            try:
                from groq import Groq
                self._client = Groq(api_key=self.api_key)
            except Exception as e:
                logger.warning(f"Groq client initialization warning: {e}")
        return self._client

    def answer_query(
        self,
        question: str,
        case_info: Dict[str, Any],
        evidence_list: List[Dict[str, Any]],
        analysis_records: List[Dict[str, Any]],
        timeline_events: List[Dict[str, Any]],
        chat_history: Optional[List[Dict[str, str]]] = None
    ) -> Dict[str, Any]:
        """
        Answers investigator question grounded strictly in case evidence and timeline events.
        """
        # 1. Build concise evidence retrieval context
        evidence_context_lines = []
        citations_found: List[Dict[str, Any]] = []

        evidence_context_lines.append(f"CASE CONTEXT: {case_info.get('id')} - {case_info.get('title')}")
        evidence_context_lines.append(f"Location: {case_info.get('location', 'Unknown')}, Incident Date: {case_info.get('incident_date', 'Unknown')}")
        evidence_context_lines.append("\nAVAILABLE EVIDENCE FILES:")
        for ev in evidence_list:
            evidence_context_lines.append(
                f"- ID: [{ev.get('id')}], Type: {ev.get('media_type')}, Original Name: {ev.get('original_name')}, Hash: {ev.get('sha256_hash', '')[:16]}..."
            )

        evidence_context_lines.append("\nCHRONOLOGICAL TIMELINE EVENTS:")
        for evt in timeline_events[:25]:  # include relevant events
            t_str = f"{evt.get('timestamp_start', 0.0):.1f}s - {evt.get('timestamp_end', 0.0):.1f}s"
            sources = ", ".join(evt.get("source_evidence_ids", []))
            evidence_context_lines.append(
                f"- Time [{t_str}] | Type: {evt.get('event_type')} | Sources: [{sources}] | Status: {evt.get('verification_status')} | Desc: {evt.get('description')}"
            )

        evidence_context_lines.append("\nDETAILED ANALYSIS OBSERVATIONS:")
        for anl in analysis_records:
            ev_id = anl.get("evidence_id")
            m_type = anl.get("media_type")
            evidence_context_lines.append(f"\n[Evidence {ev_id} ({m_type})]:")
            if anl.get("caption"):
                evidence_context_lines.append(f"  Scene Caption: {anl.get('caption')}")
            for obs in anl.get("observations", [])[:5]:
                evidence_context_lines.append(f"  - Obs: {obs}")
            if anl.get("transcript"):
                for seg in anl.get("transcript", {}).get("segments", [])[:5]:
                    evidence_context_lines.append(f"  - Audio [{seg.get('start')}s-{seg.get('end')}s]: \"{seg.get('text')}\"")

        evidence_context_str = "\n".join(evidence_context_lines)

        client = self._get_client()

        # Check if Groq API is active and key provided
        if client and self.api_key:
            try:
                messages = [{"role": "system", "content": FORENSIC_SYSTEM_PROMPT}]
                messages.append({
                    "role": "user",
                    "content": f"EVIDENCE DOSSIER:\n{evidence_context_str}\n\nINVESTIGATOR QUERY:\n{question}\n\nAnswer with strict citations and caveats per forensic protocol."
                })

                completion = client.chat.completions.create(
                    model=self.model,
                    messages=messages,
                    temperature=0.2,
                    max_tokens=1024
                )
                answer_text = completion.choices[0].message.content
                # Extract citation matches
                for ev in evidence_list:
                    if ev.get("id") in answer_text:
                        citations_found.append({
                            "evidence_id": ev.get("id"),
                            "filename": ev.get("original_name"),
                            "media_type": ev.get("media_type")
                        })

                return {
                    "answer": answer_text,
                    "citations": citations_found,
                    "model_used": self.model,
                    "grounded": True
                }
            except Exception as e:
                logger.error(f"Groq API call error: {e}. Falling back to deterministic forensic reasoner.")

        # Deterministic Grounded Reasoner Fallback (runs without API keys)
        return self._deterministic_grounded_response(question, evidence_list, timeline_events, analysis_records)

    def _deterministic_grounded_response(
        self,
        question: str,
        evidence_list: List[Dict[str, Any]],
        timeline_events: List[Dict[str, Any]],
        analysis_records: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """Provides reliable, non-hallucinating evidence retrieval and synthesis."""
        q_lower = question.lower()
        citations = []
        response_parts = []

        # Timestamp specific query (e.g. "what happened at 00:04", "around 4 seconds", "04")
        time_matches = []
        import re
        time_nums = re.findall(r'\b\d+(?:\.\d+)?\b', q_lower)
        target_time = float(time_nums[0]) if time_nums else None

        if "timeline" in q_lower or target_time is not None or "when" in q_lower:
            response_parts.append("**Timeline Analysis from Stored Records:**\n")
            matched_events = []
            for evt in timeline_events:
                t_start = evt.get("timestamp_start", 0.0)
                t_end = evt.get("timestamp_end", 0.0)
                if target_time is None or abs(t_start - target_time) <= 3.0 or (t_start <= target_time <= t_end):
                    matched_events.append(evt)
                    for s_id in evt.get("source_evidence_ids", []):
                        if not any(c.get("evidence_id") == s_id for c in citations):
                            citations.append({"evidence_id": s_id, "timestamp": t_start})

            if matched_events:
                for evt in matched_events[:5]:
                    response_parts.append(
                        f"- At **{evt.get('timestamp_start'):.1f}s - {evt.get('timestamp_end'):.1f}s** [{', '.join(evt.get('source_evidence_ids', []))}]: "
                        f"{evt.get('description')} *(Status: {evt.get('verification_status')})*"
                    )
            else:
                response_parts.append("No recorded evidence events correspond to that specific timestamp window.")

        elif "weapon" in q_lower or "gun" in q_lower or "knife" in q_lower:
            response_parts.append("**Weapon & Threat Object Assessment:**\n")
            found_candidate = False
            for anl in analysis_records:
                for det in anl.get("detections", []):
                    if det.get("is_weapon_candidate") or det.get("label") in ["knife", "scissors", "gun"]:
                        found_candidate = True
                        ev_id = anl.get("evidence_id")
                        response_parts.append(
                            f"- In evidence `[{ev_id}]`: Object labeled '{det.get('label')}' detected with {int(det.get('confidence', 0)*100)}% confidence at coordinates {det.get('bbox')}. *Caution: Requires physical ballistic/toolmark verification.*"
                        )
                        citations.append({"evidence_id": ev_id, "item": det.get("label")})
            if not found_candidate:
                response_parts.append(
                    "Standard pretrained detectors did not identify confirmed firearms or edged weapons in the analyzed evidence files. Bounding box detections identified handheld objects (e.g. mobile phone/carrying bag) which remain unverified candidate objects."
                )

        elif "witness" in q_lower or "audio" in q_lower or "said" in q_lower or "heard" in q_lower:
            response_parts.append("**Witness Audio Transcript Findings:**\n")
            found_audio = False
            for anl in analysis_records:
                if anl.get("media_type") == "audio" and anl.get("transcript"):
                    found_audio = True
                    ev_id = anl.get("evidence_id")
                    segments = anl.get("transcript", {}).get("segments", [])
                    citations.append({"evidence_id": ev_id, "media_type": "audio"})
                    for seg in segments:
                        response_parts.append(
                            f"- **[{seg.get('start')}s - {seg.get('end')}s]** in `[{ev_id}]`: \"{seg.get('text')}\" *(Speech recognition confidence: {int(seg.get('confidence', 0.9)*100)}%)*"
                        )
                    response_parts.append(
                        "\n*Note: Witness statements reflect auditory utterances, not independently corroborated physical facts.*"
                    )
            if not found_audio:
                response_parts.append("No audio witness recordings are currently registered in this investigation.")

        elif "summary" in q_lower or "overview" in q_lower or "what happened" in q_lower:
            response_parts.append(f"**Forensic Dossier Summary for Case:**\n")
            response_parts.append(f"- **Evidence items processed:** {len(evidence_list)} files.")
            response_parts.append(f"- **Total registered timeline events:** {len(timeline_events)} temporal markers.")
            for anl in analysis_records:
                ev_id = anl.get("evidence_id")
                citations.append({"evidence_id": ev_id})
                if anl.get("caption"):
                    response_parts.append(f"- `[{ev_id}]` Visual Scene: {anl.get('caption')}")
            response_parts.append(
                "\n**Investigative Caveats:** All model outputs serve strictly as decision support. No determination of guilt or identity is established by AI models."
            )
        else:
            response_parts.append(
                f"Based on the dossier of {len(evidence_list)} evidence files and {len(timeline_events)} timeline events:\n"
            )
            for anl in analysis_records[:2]:
                ev_id = anl.get("evidence_id")
                citations.append({"evidence_id": ev_id})
                for obs in anl.get("observations", [])[:3]:
                    response_parts.append(f"- `[{ev_id}]`: {obs}")
            response_parts.append(
                "\n*Any aspects not documented in the above evidence observations are not established by the available evidence.*"
            )

        return {
            "answer": "\n".join(response_parts),
            "citations": citations,
            "model_used": "CrimeVision Grounded Forensic Reasoner (Fallback / Offline Engine)",
            "grounded": True
        }

groq_forensic_service = GroqForensicService()
