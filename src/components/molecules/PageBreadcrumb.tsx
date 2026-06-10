import React from "react";
import { Link } from "react-router";

interface PageBreadcrumbProps {
  pageTitle: string;
  breadcrumbs?: {
    label: string;
    path: string;
  }[];
}

const PageBreadcrumb: React.FC<PageBreadcrumbProps> = ({ pageTitle, breadcrumbs }) => {
  return (
    <div className="flex flex-col-reverse sm:flex-row sm:items-center justify-between gap-1.5 sm:gap-3 mb-4 sm:mb-6">
      <h2 className="text-lg sm:text-xl font-semibold text-gray-800 dark:text-white/90">
        {pageTitle}
      </h2>
      <nav>
        <ol className="flex items-center gap-1.5">
          <li>
            <Link
              className="inline-flex items-center gap-1 sm:gap-1.5 text-xs sm:text-sm text-gray-500 hover:text-brand-500 dark:text-gray-400 dark:hover:text-brand-500"
              to="/"
            >
              Dashboard
              <svg
                className="fill-current"
                width="16"
                height="16"
                viewBox="0 0 16 16"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M5.80473 3.52851C5.56065 3.28443 5.16492 3.28443 4.92084 3.52851C4.67677 3.77258 4.67677 4.16831 4.92084 4.41239L8.50845 7.99999L4.92084 11.5876C4.67677 11.8317 4.67677 12.2274 4.92084 12.4715C5.16492 12.7156 5.56065 12.7156 5.80473 12.4715L9.83429 8.44193C10.0784 8.19785 10.0784 7.80212 9.83429 7.55805L5.80473 3.52851Z"
                  fill=""
                />
              </svg>
            </Link>
          </li>
          
          {breadcrumbs?.map((crumb, index) => (
            <React.Fragment key={index}>
                <li className="text-xs sm:text-sm text-gray-500 hover:text-brand-500 dark:text-gray-400 dark:hover:text-brand-500">
                    <Link to={crumb.path}>{crumb.label}</Link>
                </li>
                <li>
                     <svg
                        className="fill-current text-gray-400 w-3 h-3 sm:w-4 sm:h-4"
                        viewBox="0 0 16 16"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                    >
                        <path
                        d="M5.80473 3.52851C5.56065 3.28443 5.16492 3.28443 4.92084 3.52851C4.67677 3.77258 4.67677 4.16831 4.92084 4.41239L8.50845 7.99999L4.92084 11.5876C4.67677 11.8317 4.67677 12.2274 4.92084 12.4715C5.16492 12.7156 5.56065 12.7156 5.80473 12.4715L9.83429 8.44193C10.0784 8.19785 10.0784 7.80212 9.83429 7.55805L5.80473 3.52851Z"
                        fill=""
                        />
                    </svg>
                </li>
            </React.Fragment>
          ))}

          <li className="text-xs sm:text-sm text-gray-800 dark:text-white/90">
            {pageTitle}
          </li>
        </ol>
      </nav>
    </div>
  );
};

export default PageBreadcrumb;
