import type { FormEvent } from "react";
import { dashboardSupportCategories } from "../config/dashboardData";

type DashboardSupportWidgetProps = {
  isOpen: boolean;
  onOpen: () => void;
  onClose: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
};

export default function DashboardSupportWidget({
  isOpen,
  onOpen,
  onClose,
  onSubmit,
}: DashboardSupportWidgetProps) {
  return (
    <>
      <button
        type="button"
        className="btn-ser-need-ani"
        aria-label="Open support form"
        onClick={onOpen}
        style={{ border: "none" }}
      >
        <img src="/template-17/images/icon/help.png" alt="" loading="lazy" />
      </button>

      <div className={isOpen ? "ani-quo-form ani-quo-form-act" : "ani-quo-form"}>
        <i
          className="material-icons ani-req-clo"
          onClick={onClose}
          style={{ cursor: "pointer" }}
        >
          close
        </i>
        <div className="tit">
          <h3>
            What service do you need?
            <span>BizBook will help you</span>
          </h3>
        </div>
        <div className="hom-col-req">
          <form onSubmit={onSubmit}>
            <div className="form-group">
              <input
                type="text"
                name="enquiry_name"
                required
                className="form-control"
                placeholder="Enter name*"
              />
            </div>
            <div className="form-group">
              <input
                type="email"
                className="form-control"
                placeholder="Enter email*"
                required
                name="enquiry_email"
              />
            </div>
            <div className="form-group">
              <input
                type="text"
                className="form-control"
                name="enquiry_mobile"
                placeholder="Enter mobile number *"
                required
              />
            </div>
            <div className="form-group">
              <select
                name="enquiry_category"
                className="form-control chosen-select"
                defaultValue=""
              >
                <option value="">Select Category</option>
                {dashboardSupportCategories.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <textarea
                className="form-control"
                rows={3}
                name="enquiry_message"
                placeholder="Enter your query or message"
              ></textarea>
            </div>
            <button type="submit" className="btn btn-primary">
              Submit Requirements
            </button>
          </form>
        </div>
      </div>
    </>
  );
}
