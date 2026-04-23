import { useState } from "react";
import { Link } from "react-router-dom";
import DashboardLayout from "../components/DashboardLayout";
import { followingUsers } from "../mock/dashboardMockData";

export default function FollowingsPage() {
  const [users, setUsers] = useState(followingUsers);

  const handleToggleFollow = (id: number) => {
    setUsers((prev) =>
      prev.map((user) =>
        user.id === id
          ? { ...user, isFollowing: !user.isFollowing }
          : user
      )
    );
  };

  return (
    <DashboardLayout mainContentClassName="ud-no-rhs">
      <div className="ud-cen">
        <div className="log-bor">&nbsp;</div>
        <span className="udb-inst">Followings</span>
        <div className="ud-cen-s2">
          <h2>Following users</h2>
          <Link to="/dashboard/all-users" className="db-tit-btn">
            View all users
          </Link>
          <div className="db-fol-grid">
            <ul>
              {users.map((user) => (
                <li key={user.id}>
                  <div className="pro-fol-gr">
                    <div className="db-unfol-user">
                      <img loading="lazy" src={user.image} alt={user.name} />
                      <h4>
                        <b>{user.name}</b> {user.country}
                      </h4>
                      <Link
                        to="/profile"
                        target="_blank"
                        className="comm-viw-pro-btn"
                      ></Link>
                    </div>
                    <div className="count-li">
                      <span>
                        <b>{user.listings}</b> Listings
                      </span>
                      <span>
                        <b>{user.events}</b> Events
                      </span>
                      <span>
                        <b>{user.blogs}</b> Blogs
                      </span>
                    </div>
                    <div className="pro-pg-msg">
                      <span>
                        <i className="material-icons">message</i> Messages
                      </span>
                      <span
                        className="userfollow follow-content327"
                        onClick={() => handleToggleFollow(user.id)}
                        onKeyDown={(event) => {
                          if (event.key === "Enter" || event.key === " ") {
                            event.preventDefault();
                            handleToggleFollow(user.id);
                          }
                        }}
                        role="button"
                        tabIndex={0}
                      >
                        {user.isFollowing ? "Un-follow" : "Follow"}
                      </span>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
