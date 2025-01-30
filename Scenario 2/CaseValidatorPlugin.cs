using System;
using Microsoft.Xrm.Sdk;
using Microsoft.Xrm.Sdk.Query;

namespace CasePlugin
{
    public class CaseValidatorPlugin : IPlugin
    {
        // Entity and attribute names
        private const string Incident = "incident";
        private const string CustomerId = "customerid";
        private const string StateCode = "statecode";

        public void Execute(IServiceProvider serviceProvider)
        {
            // Retrieve the required services from the service provider and validate them before using
            var (context, tracingService, service) = RetrieveServices(serviceProvider);

            tracingService.Trace("Plugin execution started for Case ID: {0}", context.PrimaryEntityId);

            // Validate and process the target entity to check for active cases
            try
            {
                var targetEntity = ValidateTargetEntity(context);
                var customerId = GetCustomerId(targetEntity);

                tracingService.Trace("Checking active cases for Customer ID: {0}", customerId);

                // Check if the customer has any active cases
                if (HasActiveCases(service, customerId))
                {
                    tracingService.Trace("Active case found for Customer ID: {0}. Blocking case creation", customerId);
                    throw new InvalidPluginExecutionException("Cannot create Case. This Customer is linked to another Active Case");
                }

                tracingService.Trace("No active cases found. Case creation successful");
            }
            // Catch and log any exceptions that occur during the plugin execution
            catch (Exception ex)
            {
                tracingService.Trace("Error occurred: {0}", ex.Message);
                throw;
            }
        }

        /// <summary>
        /// Retrieve the required services from the service provider and validate them before returning
        /// </summary>
        /// <param name="serviceProvider">the service provider instance</param> 
        /// <returns>a tuple containing the Plugin Execution Context, Tracing Service and Organization Service</returns>
        private static (IPluginExecutionContext, ITracingService, IOrganizationService) RetrieveServices(IServiceProvider serviceProvider)
        {
            var context = ValidateAndRetrieve<IPluginExecutionContext>(serviceProvider, typeof(IPluginExecutionContext), "Plugin execution context");
            var tracingService = ValidateAndRetrieve<ITracingService>(serviceProvider, typeof(ITracingService), "Tracing service");
            var service = ValidateAndRetrieve<IOrganizationServiceFactory>(serviceProvider, typeof(IOrganizationServiceFactory), "Organization service factory")
                .CreateOrganizationService(context.UserId);

            return (context, tracingService, service);
        }

        /// <summary>
        /// Validate the service provider and retrieve the service of the specified type and name
        /// </summary>
        /// <typeparam name="T">the type of service to retrieve</typeparam>
        /// <param name="serviceProvider">the service provider instance</param>
        /// <param name="serviceType">the type of service to retrieve</param>
        /// <param name="serviceName">the name of the service to retrieve</param>
        /// <returns>the service instance of the specified type and name</returns>
        /// <exception cref="InvalidPluginExecutionException">error message if the service is missing or invalid</exception>
        private static T ValidateAndRetrieve<T>(IServiceProvider serviceProvider, Type serviceType, string serviceName)
        {
            var service = serviceProvider.GetService(serviceType);
            if (service == null)
            {
                throw new InvalidPluginExecutionException($"{serviceName} unavailable");
            }

            if (!(service is T))
            {
                throw new InvalidPluginExecutionException($"{serviceName} is not of the expected type");
            }

            return (T)service;
        }

        /// <summary>
        /// Validate the target entity and retrieve it from the plugin execution context
        /// </summary>
        /// <param name="context">the plugin execution context</param>
        /// <returns>the target entity from the plugin execution context</returns>
        /// <exception cref="InvalidPluginExecutionException">error message if the target entity is missing or invalid</exception>
        private static Entity ValidateTargetEntity(IPluginExecutionContext context)
        {
            if (!context.InputParameters.Contains("Target") || !(context.InputParameters["Target"] is Entity targetEntity))
            {
                throw new InvalidPluginExecutionException("Target entity is missing or invalid");
            }
            return targetEntity;
        }

        /// <summary>
        /// Retrieve the Customer ID from the target entity
        /// </summary>
        /// <param name="targetEntity">the target entity from the plugin execution context</param>
        /// <returns>the customer ID from the target entity</returns>
        /// <exception cref="InvalidPluginExecutionException"></exception>
        private static Guid GetCustomerId(Entity targetEntity)
        {
            if (!(targetEntity.GetAttributeValue<EntityReference>(CustomerId) is EntityReference customerReference))
            {
                throw new InvalidPluginExecutionException("Customer ID is missing or invalid");
            }
            return customerReference.Id;
        }

        /// <summary>
        /// Check if the customer has any active cases
        /// </summary>
        /// <param name="service">the organization service instance</param>
        /// <param name="customerId">the customer ID to check for active cases</param>
        /// <returns>true if the customer has active cases, otherwise false</returns>
        private static bool HasActiveCases(IOrganizationService service, Guid customerId)
        {
            var query = new QueryExpression(Incident)
            {
                ColumnSet = new ColumnSet("incidentid"),
                TopCount = 1,
                Criteria = new FilterExpression
                {
                    Conditions =
                    {
                        new ConditionExpression(StateCode, ConditionOperator.Equal, 0),
                        new ConditionExpression(CustomerId, ConditionOperator.Equal, customerId)
                    }
                }
            };

            var activeCases = service.RetrieveMultiple(query);
            return activeCases.Entities.Count > 0;
        }
    }
}
